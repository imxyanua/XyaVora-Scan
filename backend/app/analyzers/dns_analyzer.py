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
        val = r.value.strip('"')
        if val.startswith("v=spf1"):
            return True, val
    return False, None


def _detect_dmarc(dmarc_records: list[DnsRecord]) -> tuple[bool, str | None]:
    for r in dmarc_records:
        val = r.value.strip('"')
        if val.startswith("v=DMARC1"):
            return True, val
    return False, None


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
    elif dmarc_record and "p=none" in dmarc_record:
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

    dns_result = DnsResult(
        records=all_records + dmarc_records,
        spfDetected=spf_detected,
        dmarcDetected=dmarc_detected,
        spfRecord=spf_record,
        dmarcRecord=dmarc_record,
    )

    findings = _build_findings(dns_result, dmarc_record)

    return AnalyzerResult(key="dns", status="success", data=dns_result, findings=findings)
