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


def _spf_records(txt_records: list[DnsRecord]) -> list[str]:
    return [
        _clean_txt_value(r.value)
        for r in txt_records
        if _clean_txt_value(r.value).lower().startswith("v=spf1")
    ]


def _dmarc_records(dmarc_records: list[DnsRecord]) -> list[str]:
    return [
        _clean_txt_value(r.value)
        for r in dmarc_records
        if _clean_txt_value(r.value).lower().startswith("v=dmarc1")
    ]


def _detect_spf(txt_records: list[DnsRecord]) -> tuple[bool, str | None]:
    records = _spf_records(txt_records)
    return bool(records), records[0] if records else None


def _detect_dmarc(dmarc_records: list[DnsRecord]) -> tuple[bool, str | None]:
    records = _dmarc_records(dmarc_records)
    return bool(records), records[0] if records else None


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


def _email_security_confidence(result: DnsResult) -> str:
    if result.mxDetected and result.spfDetected and result.dmarcDetected:
        if result.spfAll == "-" and result.dmarcPolicy in ("quarantine", "reject"):
            return "high"
        return "medium"
    if result.mxDetected or result.spfDetected or result.dmarcDetected:
        return "low"
    return "low"


def _record_evidence(records: list[DnsRecord]) -> list[str]:
    return [f"{record.host} {record.type} {record.value} ttl={record.ttl if record.ttl is not None else 'unknown'}" for record in records]


def _build_findings(
    result: DnsResult,
    dmarc_record: str | None,
) -> list[Finding]:
    findings: list[Finding] = []

    if result.spfRecordCount > 1:
        findings.append(Finding(
            id="spf_multiple_records",
            severity="medium",
            category="DNS",
            title="Multiple SPF Records Published",
            description=f"The domain publishes {result.spfRecordCount} SPF TXT records. SPF expects a single policy record.",
            impact="Receivers can treat multiple SPF records as a permanent SPF error, reducing mail authentication reliability.",
            recommendation="Merge all SPF mechanisms into one v=spf1 TXT record and remove duplicate SPF records.",
            status="fail",
            confidence="verified",
            source="dns",
            evidence=result.spfEvidence,
        ))

    if result.dmarcRecordCount > 1:
        findings.append(Finding(
            id="dmarc_multiple_records",
            severity="medium",
            category="DNS",
            title="Multiple DMARC Records Published",
            description=f"The domain publishes {result.dmarcRecordCount} DMARC TXT records at _dmarc.",
            impact="Receivers may ignore DMARC when multiple records are present, weakening spoofing protection.",
            recommendation="Keep exactly one DMARC TXT record at _dmarc.<domain>.",
            status="fail",
            confidence="verified",
            source="dns",
            evidence=result.dmarcEvidence,
        ))

    if not result.spfDetected:
        findings.append(Finding(
            id="missing_spf",
            severity="medium",
            category="DNS",
            title="SPF Record Is Missing",
            description="The domain does not publish an SPF TXT record to define allowed mail senders.",
            impact="Without SPF, anyone can send email that appears to come from this domain, enabling phishing attacks.",
            recommendation="Add an SPF TXT record listing legitimate mail providers, then end with -all after validation.",
            status="fail",
            confidence="observed",
            source="dns",
            evidence=["No TXT record starting with v=spf1 was returned for the domain."],
        ))

    if not result.dmarcDetected:
        findings.append(Finding(
            id="missing_dmarc",
            severity="medium",
            category="DNS",
            title="DMARC Policy Is Missing",
            description="The domain does not publish a DMARC policy at _dmarc.<domain>.",
            impact="Without DMARC, email spoofing attempts go unreported and unenforced.",
            recommendation="Publish a DMARC TXT record. Start with p=none for monitoring, then move to quarantine or reject once legitimate senders align.",
            status="fail",
            confidence="observed",
            source="dns",
            evidence=["No TXT record starting with v=DMARC1 was returned at _dmarc.<domain>."],
        ))
    elif result.dmarcPolicy == "none":
        # p=none means the policy exists but takes no action on failures — reports only
        findings.append(Finding(
            id="dmarc_not_strict",
            severity="medium",
            category="DNS",
            title="DMARC Is Monitoring Only",
            description=f"DMARC exists, but the policy is p=none and does not enforce failures: {dmarc_record}",
            impact="Email that fails DMARC checks is still delivered. The policy offers no protection, only reporting.",
            recommendation="Review DMARC reports, fix sender alignment, then change policy to p=quarantine or p=reject.",
            status="warning",
            confidence="verified",
            source="dns",
            evidence=[dmarc_record] if dmarc_record else [],
        ))
    elif result.dmarcDetected and result.dmarcPolicy not in ("none", "quarantine", "reject"):
        findings.append(Finding(
            id="dmarc_invalid_policy",
            severity="medium",
            category="DNS",
            title="DMARC Policy Is Invalid Or Missing",
            description=f"DMARC exists, but the p= policy is missing or not recognized: {dmarc_record}",
            impact="Receivers may ignore the DMARC policy or treat it as invalid.",
            recommendation="Set DMARC p=none, p=quarantine, or p=reject. Move toward quarantine/reject after monitoring.",
            status="warning",
            confidence="verified",
            source="dns",
            evidence=[dmarc_record] if dmarc_record else [],
        ))

    if result.spfAll in ("+", "?"):
        findings.append(Finding(
            id="spf_weak_all_policy",
            severity="medium",
            category="DNS",
            title="SPF Policy Is Too Permissive",
            description=f"SPF record ends with '{result.spfAll}all', which does not strongly reject unauthorized senders.",
            impact="Spoofed mail may pass SPF or fail without meaningful enforcement.",
            recommendation="Use -all after validating legitimate mail sources. Use ~all only as a temporary transition state.",
            status="warning",
            confidence="verified",
            source="dns",
            evidence=[result.spfRecord] if result.spfRecord else [],
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
            confidence="verified",
            source="dns",
            evidence=[result.spfRecord] if result.spfRecord else [],
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
            confidence="verified",
            source="dns",
            evidence=[result.dmarcRecord] if result.dmarcRecord else [],
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

    spf_records = _spf_records(txt_records)
    dmarc_policy_records = _dmarc_records(dmarc_records)
    spf_detected, spf_record     = bool(spf_records), spf_records[0] if spf_records else None
    dmarc_detected, dmarc_record = bool(dmarc_policy_records), dmarc_policy_records[0] if dmarc_policy_records else None
    spf_info = _parse_spf(spf_record)
    dmarc_info = _parse_dmarc(dmarc_record)
    mx_records = [r.value for r in all_records if r.type == "MX"]
    mx_dns_records = [r for r in all_records if r.type == "MX"]
    dns_query_evidence = [
        f"{rtype}: {sum(1 for record in all_records if record.type == rtype)} record(s)"
        for rtype in _RECORD_TYPES
    ]
    dns_query_evidence.append(f"_dmarc TXT: {len(dmarc_records)} record(s)")

    dns_result = DnsResult(
        records=all_records + dmarc_records,
        mxDetected=bool(mx_records),
        mxRecords=mx_records,
        mxEvidence=_record_evidence(mx_dns_records),
        spfDetected=spf_detected,
        dmarcDetected=dmarc_detected,
        spfRecordCount=len(spf_records),
        dmarcRecordCount=len(dmarc_policy_records),
        spfRecord=spf_record,
        dmarcRecord=dmarc_record,
        spfEvidence=_record_evidence([r for r in txt_records if _clean_txt_value(r.value) in spf_records]),
        dmarcEvidence=_record_evidence([r for r in dmarc_records if _clean_txt_value(r.value) in dmarc_policy_records]),
        dnsQueryEvidence=dns_query_evidence,
        **spf_info,
        **dmarc_info,
    )
    dns_result.emailSecurityConfidence = _email_security_confidence(dns_result)  # type: ignore[assignment]

    findings = _build_findings(dns_result, dmarc_record)

    return AnalyzerResult(key="dns", status="success", data=dns_result, findings=findings)
