import asyncio
import dns.asyncresolver
import dns.exception

from app.schemas.report import DnsRecord, DnsResult, Finding
from app.schemas.analyzer import AnalyzerResult

# Record types to query. SOA and CNAME are excluded — SOA is internal
# infrastructure detail, CNAME requires chasing the chain which adds latency.
_RECORD_TYPES = ("A", "AAAA", "MX", "NS", "TXT")


async def _query(resolver: dns.asyncresolver.Resolver, hostname: str, rtype: str) -> list[DnsRecord]:
    try:
        answers = await resolver.resolve(hostname, rtype)
    except (dns.exception.DNSException, Exception):
        return []

    records: list[DnsRecord] = []
    for rdata in answers:
        value = rdata.to_text().rstrip(".")
        ttl = int(answers.ttl) if answers.ttl else None
        records.append(DnsRecord(type=rtype, host=hostname, value=value, ttl=ttl))  # type: ignore[arg-type]
    return records


def _detect_spf(txt_records: list[DnsRecord]) -> tuple[bool, str | None]:
    for r in txt_records:
        # SPF records always start with "v=spf1" per RFC 7208
        val = _clean_txt_value(r.value)
        if val.lower().startswith("v=spf1"):
            return True, val
    return False, None


def _detect_dmarc(dmarc_records: list[DnsRecord]) -> tuple[bool, str | None]:
    for r in dmarc_records:
        val = _clean_txt_value(r.value)
        if val.lower().startswith("v=dmarc1"):
            return True, val
    return False, None


def _clean_txt_value(value: str) -> str:
    return value.replace('" "', "").strip('"').strip()


def _parse_spf(record: str | None) -> dict:
    if not record:
        return {"spfAll": None, "spfLookupCount": 0}

    lookup_count = 0
    all_policy: str | None = None

    for token in record.split()[1:]:
        mechanism = token.lower().lstrip("+-~?")
        if (
            mechanism.startswith(("include:", "exists:", "redirect=", "ptr"))
            or mechanism == "a"
            or mechanism.startswith("a:")
            or mechanism == "mx"
            or mechanism.startswith("mx:")
        ):
            lookup_count += 1
        if mechanism == "all":
            all_policy = token[0] if token[0] in ("+", "-", "~", "?") else "+"

    return {"spfAll": all_policy, "spfLookupCount": lookup_count}


def _parse_dmarc(record: str | None) -> dict:
    empty = {
        "dmarcPolicy": None,
        "dmarcSubdomainPolicy": None,
        "dmarcPct": None,
        "dmarcRua": None,
        "dmarcRuf": None,
        "dmarcAlignmentDkim": None,
        "dmarcAlignmentSpf": None,
    }
    if not record:
        return empty

    tags: dict[str, str] = {}
    for part in record.split(";"):
        if "=" not in part:
            continue
        key, _, value = part.strip().partition("=")
        tags[key.lower()] = value.strip()

    pct = None
    if tags.get("pct"):
        try:
            pct = int(tags["pct"])
        except ValueError:
            pct = None

    return {
        "dmarcPolicy": tags.get("p"),
        "dmarcSubdomainPolicy": tags.get("sp"),
        "dmarcPct": pct,
        "dmarcRua": tags.get("rua"),
        "dmarcRuf": tags.get("ruf"),
        "dmarcAlignmentDkim": tags.get("adkim"),
        "dmarcAlignmentSpf": tags.get("aspf"),
    }


def _build_findings(
    result: DnsResult,
    dmarc_record: str | None,
) -> list[Finding]:
    findings: list[Finding] = []

    if not result.spfDetected:
        findings.append(Finding(
            id="missing_spf",
            severity="medium",
            category="DNS",
            title="Missing SPF Record",
            description="No SPF (Sender Policy Framework) TXT record was found for this domain.",
            impact="Without SPF, anyone can send email that appears to come from this domain, enabling phishing attacks.",
            recommendation="Add a TXT record: 'v=spf1 include:<your-mail-provider> -all'",
            status="fail",
        ))

    if not result.dmarcDetected:
        findings.append(Finding(
            id="missing_dmarc",
            severity="medium",
            category="DNS",
            title="Missing DMARC Record",
            description="No DMARC policy record was found at _dmarc.<domain>.",
            impact="Without DMARC, email spoofing attempts go unreported and unenforced.",
            recommendation="Add a TXT record at _dmarc.<domain>: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@<domain>'",
            status="fail",
        ))
    elif result.dmarcPolicy == "none":
        # p=none means the policy exists but takes no action on failures — reports only
        findings.append(Finding(
            id="dmarc_not_strict",
            severity="medium",
            category="DNS",
            title="DMARC Policy Not Enforced (p=none)",
            description=f"DMARC record found but policy is set to 'p=none': {dmarc_record}",
            impact="Email that fails DMARC checks is still delivered. The policy offers no protection, only reporting.",
            recommendation="Change DMARC policy to 'p=quarantine' or 'p=reject'.",
            status="warning",
        ))

    if result.spfAll in ("+", "?"):
        findings.append(Finding(
            id="spf_weak_all_policy",
            severity="medium",
            category="DNS",
            title="SPF Policy Is Too Permissive",
            description=f"SPF record ends with '{result.spfAll}all', which does not strongly reject unauthorized senders.",
            impact="Spoofed mail may pass SPF or fail without meaningful enforcement.",
            recommendation="Use '-all' after validating all legitimate mail sources. '~all' is acceptable during transition.",
            status="warning",
        ))
    elif result.spfLookupCount > 10:
        findings.append(Finding(
            id="spf_too_many_dns_lookups",
            severity="medium",
            category="DNS",
            title="SPF May Exceed DNS Lookup Limit",
            description=f"SPF record uses approximately {result.spfLookupCount} DNS-lookup mechanisms.",
            impact="SPF evaluation fails with PermError if more than 10 DNS lookups are required.",
            recommendation="Flatten or simplify SPF includes to keep DNS lookups at 10 or fewer.",
            status="warning",
        ))

    if result.dmarcDetected and result.dmarcPct is not None and result.dmarcPct < 100:
        findings.append(Finding(
            id="dmarc_partial_enforcement",
            severity="low",
            category="DNS",
            title="DMARC Applies To Partial Traffic",
            description=f"DMARC pct is set to {result.dmarcPct}, so policy applies to only part of mail flow.",
            impact="Some spoofed mail may not receive the configured DMARC enforcement action.",
            recommendation="Move pct to 100 after validating reports and legitimate sender alignment.",
            status="warning",
        ))

    return findings


async def analyze_dns(hostname: str) -> AnalyzerResult:
    resolver = dns.asyncresolver.Resolver()
    resolver.timeout = 3
    resolver.lifetime = 4   # per-query cap; keeps total well inside ANALYZER_TIMEOUT_SECONDS

    # Run all record type queries + DMARC concurrently in one gather call
    *type_results, dmarc_result = await asyncio.gather(
        *[_query(resolver, hostname, rtype) for rtype in _RECORD_TYPES],
        _query(resolver, f"_dmarc.{hostname}", "TXT"),
        return_exceptions=True,
    )
    results = type_results  # keep variable name for the loop below

    all_records: list[DnsRecord] = []
    for r in results:
        if isinstance(r, list):
            all_records.extend(r)

    txt_records = [r for r in all_records if r.type == "TXT"]

    dmarc_records: list[DnsRecord] = dmarc_result if isinstance(dmarc_result, list) else []

    spf_detected, spf_record     = _detect_spf(txt_records)
    dmarc_detected, dmarc_record = _detect_dmarc(dmarc_records)
    spf_info = _parse_spf(spf_record)
    dmarc_info = _parse_dmarc(dmarc_record)
    mx_records = [r.value for r in all_records if r.type == "MX"]

    dns_result = DnsResult(
        records=all_records + dmarc_records,
        mxDetected=bool(mx_records),
        mxRecords=mx_records,
        spfDetected=spf_detected,
        dmarcDetected=dmarc_detected,
        spfRecord=spf_record,
        dmarcRecord=dmarc_record,
        **spf_info,
        **dmarc_info,
    )

    findings = _build_findings(dns_result, dmarc_record)

    return AnalyzerResult(key="dns", status="success", data=dns_result, findings=findings)
