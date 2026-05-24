import asyncio
import dns.asyncresolver
import dns.exception

from app.schemas.report import DnsRecord, DnsResult, Finding
from app.schemas.analyzer import AnalyzerResult

# Record types to query. SOA and CNAME are excluded — SOA is internal
# infrastructure detail, CNAME requires chasing the chain which adds latency.
_RECORD_TYPES = ("A", "AAAA", "MX", "NS", "TXT")
_DKIM_SELECTORS = (
    "default",
    "dkim",
    "google",
    "selector1",
    "selector2",
    "s1",
    "s2",
    "k1",
    "mail",
)


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
        return {
            "spfAll": None,
            "spfLookupCount": 0,
            "spfIncludes": [],
            "spfRedirect": None,
            "spfMechanisms": [],
        }

    lookup_count = 0
    all_policy: str | None = None
    includes: list[str] = []
    redirect: str | None = None
    mechanisms: list[str] = []

    for token in record.split()[1:]:
        mechanism = token.lower().lstrip("+-~?")
        mechanisms.append(token)
        if (
            mechanism.startswith(("include:", "exists:", "redirect=", "ptr"))
            or mechanism == "a"
            or mechanism.startswith("a:")
            or mechanism == "mx"
            or mechanism.startswith("mx:")
        ):
            lookup_count += 1
        if mechanism.startswith("include:"):
            includes.append(mechanism.split(":", 1)[1])
        if mechanism.startswith("redirect="):
            redirect = mechanism.split("=", 1)[1]
        if mechanism == "all":
            all_policy = token[0] if token[0] in ("+", "-", "~", "?") else "+"

    return {
        "spfAll": all_policy,
        "spfLookupCount": lookup_count,
        "spfIncludes": includes,
        "spfRedirect": redirect,
        "spfMechanisms": mechanisms,
    }


def _parse_dmarc(record: str | None) -> dict:
    empty = {
        "dmarcPolicy": None,
        "dmarcSubdomainPolicy": None,
        "dmarcPct": None,
        "dmarcRua": None,
        "dmarcRuf": None,
        "dmarcReportingEnabled": False,
        "dmarcForensicReportingEnabled": False,
        "dmarcEnforcement": None,
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
        "dmarcReportingEnabled": bool(tags.get("rua")),
        "dmarcForensicReportingEnabled": bool(tags.get("ruf")),
        "dmarcEnforcement": _dmarc_enforcement(tags.get("p")),
        "dmarcAlignmentDkim": tags.get("adkim"),
        "dmarcAlignmentSpf": tags.get("aspf"),
    }


def _dmarc_enforcement(policy: str | None) -> str | None:
    if policy in ("quarantine", "reject"):
        return "enforced"
    if policy == "none":
        return "monitoring"
    return None


def _detect_mx_providers(mx_records: list[str]) -> list[str]:
    providers: list[str] = []
    patterns = [
        ("Google Workspace", ("google.com", "googlemail.com", "aspmx.l.google.com")),
        ("Microsoft 365", ("protection.outlook.com", "mail.protection.outlook.com")),
        ("Zoho Mail", ("zoho.com", "zoho.eu")),
        ("Proton Mail", ("protonmail.ch", "protonmail.com")),
        ("Fastmail", ("messagingengine.com",)),
        ("Cloudflare Email Routing", ("mx.cloudflare.net",)),
        ("Amazon SES", ("amazonses.com",)),
        ("Mailgun", ("mailgun.org",)),
        ("SendGrid", ("sendgrid.net",)),
    ]

    for record in mx_records:
        value = record.lower()
        for provider, needles in patterns:
            if provider not in providers and any(needle in value for needle in needles):
                providers.append(provider)

    return providers


def _email_security_confidence(result: DnsResult) -> str:
    if result.mxDetected and result.spfDetected and result.dmarcDetected:
        if result.spfAll == "-" and result.dmarcPolicy in ("quarantine", "reject") and result.dkimSelectorsFound:
            return "high"
        return "medium"
    if result.mxDetected or result.spfDetected or result.dmarcDetected:
        return "low"
    return "low"


def _record_evidence(records: list[DnsRecord]) -> list[str]:
    return [f"{record.host} {record.type} {record.value} ttl={record.ttl if record.ttl is not None else 'unknown'}" for record in records]


def _dnssec_candidate_hosts(hostname: str) -> list[str]:
    labels = [label for label in hostname.strip(".").split(".") if label]
    if len(labels) < 2:
        return [hostname]

    candidates: list[str] = []
    for index in range(0, max(len(labels) - 1, 1)):
        candidate = ".".join(labels[index:])
        if candidate not in candidates:
            candidates.append(candidate)

    return candidates


async def _query_dnssec(
    resolver: dns.asyncresolver.Resolver,
    hostname: str,
) -> tuple[list[DnsRecord], dict]:
    evidence: list[str] = []
    checked_host: str | None = None

    for candidate in _dnssec_candidate_hosts(hostname):
        checked_host = candidate
        ds_records = await _query(resolver, candidate, "DS")
        evidence.append(f"{candidate} DS: {len(ds_records)} record(s)")
        if not ds_records:
            continue

        dnskey_records = await _query(resolver, candidate, "DNSKEY")
        evidence.append(f"{candidate} DNSKEY: {len(dnskey_records)} record(s)")
        return ds_records + dnskey_records, {
            "dnssecCheckedHost": candidate,
            "dnssecSigned": True,
            "dnssecDsRecords": [record.value for record in ds_records],
            "dnssecDnskeyRecords": [record.value for record in dnskey_records],
            "dnssecEvidence": [
                *evidence,
                *_record_evidence(ds_records[:5]),
                *_record_evidence(dnskey_records[:5]),
            ],
            "dnssecConfidence": "high" if dnskey_records else "medium",
        }

    return [], {
        "dnssecCheckedHost": checked_host or hostname,
        "dnssecSigned": False,
        "dnssecDsRecords": [],
        "dnssecDnskeyRecords": [],
        "dnssecEvidence": evidence or [f"{hostname} DS: no DNSSEC delegation data observed"],
        "dnssecConfidence": "medium" if evidence else "low",
    }


def _dkim_txt_values(records: list[DnsRecord]) -> list[str]:
    return [
        _clean_txt_value(record.value)
        for record in records
        if _clean_txt_value(record.value).lower().startswith("v=dkim1")
    ]


async def _query_dkim_selectors(
    resolver: dns.asyncresolver.Resolver,
    hostname: str,
) -> tuple[list[DnsRecord], dict]:
    txt_results = await asyncio.gather(
        *[_query(resolver, f"{selector}._domainkey.{hostname}", "TXT") for selector in _DKIM_SELECTORS],
        return_exceptions=True,
    )
    cname_results = await asyncio.gather(
        *[_query(resolver, f"{selector}._domainkey.{hostname}", "CNAME") for selector in _DKIM_SELECTORS],
        return_exceptions=True,
    )

    found_records: list[DnsRecord] = []
    found_selectors: list[str] = []
    evidence: list[str] = []

    for selector, txt_result, cname_result in zip(_DKIM_SELECTORS, txt_results, cname_results):
        txt_records = txt_result if isinstance(txt_result, list) else []
        cname_records = cname_result if isinstance(cname_result, list) else []
        dkim_txt_values = _dkim_txt_values(txt_records)
        selector_records = [*txt_records, *cname_records]
        if dkim_txt_values or cname_records:
            found_selectors.append(selector)
            found_records.extend(selector_records)
            evidence.extend(_record_evidence(selector_records[:5]))
        else:
            evidence.append(f"{selector}._domainkey.{hostname}: no common DKIM TXT/CNAME observed")

    return found_records, {
        "dkimSelectorsChecked": list(_DKIM_SELECTORS),
        "dkimSelectorsFound": found_selectors,
        "dkimRecords": [record.value for record in found_records],
        "dkimEvidence": evidence,
    }


def _mail_auth_absence_evidence(result: DnsResult, record_type: str, target: str) -> list[str]:
    evidence = [
        f"missing: {record_type}",
        f"target: {target}",
        f"mx_detected: {result.mxDetected}",
    ]
    if result.mxEvidence:
        evidence.extend(result.mxEvidence[:5])
    else:
        evidence.append("mx_evidence: no MX records observed during this scan")
    return evidence


def _dns_hostname(result: DnsResult, hostname: str | None = None) -> str:
    if hostname:
        return hostname
    if result.records:
        return result.records[0].host
    return "<domain>"


def _build_findings(
    result: DnsResult,
    dmarc_record: str | None,
    hostname: str | None = None,
) -> list[Finding]:
    findings: list[Finding] = []
    target = _dns_hostname(result, hostname)
    dmarc_target = f"_dmarc.{target}"

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
            analysis="More than one TXT record beginning with v=spf1 was observed for the same domain.",
            verification=f"Run dig TXT {target} and confirm only one TXT value starts with v=spf1.",
            classification="verified-issue",
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
            analysis="More than one TXT record beginning with v=DMARC1 was observed at the _dmarc host.",
            verification=f"Run dig TXT {dmarc_target} and confirm exactly one TXT value starts with v=DMARC1.",
            classification="verified-issue",
        ))

    if not result.spfDetected:
        mail_context = "active mail exchange records were observed" if result.mxDetected else "no MX records were observed during this scan"
        findings.append(Finding(
            id="missing_spf",
            severity="medium" if result.mxDetected else "low",
            category="DNS",
            title="SPF Record Not Observed",
            description=f"The domain does not publish an SPF TXT record to define allowed mail senders; {mail_context}.",
            impact="If this domain sends email, missing SPF weakens sender authorization and can make spoofing harder for receivers to evaluate.",
            recommendation="Add an SPF TXT record listing legitimate mail providers, then end with -all after validation.",
            status="warning",
            confidence="best-practice",
            source="dns",
            evidence=_mail_auth_absence_evidence(result, "SPF", target),
            analysis=(
                "TXT records were queried for the domain, but none of the returned TXT values started with v=spf1. "
                "This is most important for domains that actively send mail; absence alone does not prove active abuse."
            ),
            verification=f"Run dig TXT {target} and check whether a TXT value begins with v=spf1.",
            classification="hardening-recommendation" if result.mxDetected else "investigation-lead",
        ))

    if not result.dmarcDetected:
        mail_context = "active mail exchange records were observed" if result.mxDetected else "no MX records were observed during this scan"
        findings.append(Finding(
            id="missing_dmarc",
            severity="medium" if result.mxDetected else "low",
            category="DNS",
            title="DMARC Policy Not Observed",
            description=f"The domain does not publish a DMARC policy at _dmarc.<domain>; {mail_context}.",
            impact="If this domain sends email, missing DMARC reduces reporting and enforcement for spoofed messages.",
            recommendation="Publish a DMARC TXT record. Start with p=none for monitoring, then move to quarantine or reject once legitimate senders align.",
            status="warning",
            confidence="best-practice",
            source="dns",
            evidence=_mail_auth_absence_evidence(result, "DMARC", dmarc_target),
            analysis=(
                "TXT records were queried at the _dmarc host, but no returned TXT value started with v=DMARC1. "
                "This is most important for domains that actively send mail; absence alone does not prove active abuse."
            ),
            verification=f"Run dig TXT {dmarc_target} and check whether a TXT value begins with v=DMARC1.",
            classification="hardening-recommendation" if result.mxDetected else "investigation-lead",
        ))
    elif result.dmarcPolicy == "none":
        # p=none means the policy exists but takes no action on failures — reports only
        findings.append(Finding(
            id="dmarc_not_strict",
            severity="medium",
            category="DNS",
            title="DMARC Is Monitoring Only",
            description=f"DMARC exists, but the policy is p=none and does not enforce failures: {dmarc_record}",
            impact="Email that fails DMARC checks is not rejected by this policy. It provides monitoring/reporting before enforcement.",
            recommendation="Review DMARC reports, fix sender alignment, then change policy to p=quarantine or p=reject.",
            status="warning",
            confidence="verified",
            source="dns",
            evidence=[dmarc_record] if dmarc_record else [],
            analysis="The DMARC record was found, and its p= tag is set to none, which means monitoring without enforcement.",
            verification=f"Run dig TXT {dmarc_target} and inspect the p= tag in the DMARC record.",
            classification="observed-risk",
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
            analysis="The DMARC record was found, but the p= tag was missing or outside the recognized values none, quarantine, and reject.",
            verification=f"Run dig TXT {dmarc_target} and validate the p= tag syntax.",
            classification="verified-issue",
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
            analysis="The SPF record was found, and its all mechanism is permissive rather than a hard fail.",
            verification=f"Run dig TXT {target} and inspect whether the SPF record ends with +all, ?all, ~all, or -all.",
            classification="observed-risk",
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
            analysis="The SPF record contains more DNS-lookup mechanisms than the SPF limit allows.",
            verification=f"Run an SPF validator against {target} and count include, a, mx, exists, ptr, and redirect lookups.",
            classification="verified-issue",
        ))
    elif result.spfLookupCount >= 8:
        findings.append(Finding(
            id="spf_lookup_budget_high",
            severity="low",
            category="DNS",
            title="SPF DNS Lookup Budget Is High",
            description=f"SPF record uses approximately {result.spfLookupCount} DNS-lookup mechanisms out of the 10 lookup limit.",
            impact="Future SPF includes can push the policy over the limit and cause SPF PermError.",
            recommendation="Review SPF includes and keep the policy comfortably below 10 DNS lookups.",
            status="warning",
            confidence="verified",
            source="dns",
            evidence=[result.spfRecord] if result.spfRecord else [],
            analysis="The SPF record was found and its DNS-lookup mechanism count is close to the SPF limit.",
            verification=f"Run an SPF validator against {target} and count include, a, mx, exists, ptr, and redirect lookups.",
            classification="observed-risk",
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
            analysis="The DMARC record was found, and its pct tag applies enforcement to less than all matching mail.",
            verification=f"Run dig TXT {dmarc_target} and inspect the pct= tag.",
            classification="observed-risk",
        ))

    if result.dmarcDetected and not result.dmarcReportingEnabled:
        findings.append(Finding(
            id="dmarc_reporting_not_configured",
            severity="info",
            category="DNS",
            title="DMARC Aggregate Reporting Not Configured",
            description="DMARC exists, but no rua aggregate reporting destination was observed.",
            impact="The domain may have less visibility into spoofing attempts and authentication failures.",
            recommendation="Add a rua=mailto: destination if the domain owner wants aggregate DMARC reports.",
            status="info",
            confidence="observed",
            source="dns",
            evidence=[result.dmarcRecord] if result.dmarcRecord else [],
            analysis="The DMARC record was parsed and no rua tag was found.",
            verification=f"Run dig TXT {dmarc_target} and inspect the rua= tag.",
            classification="informational",
        ))

    if result.mxDetected and not result.dkimSelectorsFound:
        findings.append(Finding(
            id="dkim_common_selectors_not_observed",
            severity="info",
            category="DNS",
            title="Common DKIM Selectors Not Observed",
            description="The scanner did not find DKIM records at common selector names.",
            impact="This does not prove DKIM is absent because DKIM selectors are chosen by the mail platform and may be non-standard.",
            recommendation="Verify DKIM selectors from the mail provider and check selector._domainkey records directly.",
            status="info",
            confidence="inferred",
            source="dns",
            evidence=result.dkimEvidence[:10],
            analysis="Common selector discovery checked a short list of frequent DKIM selectors and did not observe TXT/CNAME records.",
            verification=f"Ask the mail provider for the DKIM selector, then run dig TXT <selector>._domainkey.{target}.",
            classification="investigation-lead",
        ))

    return findings


async def analyze_dns(hostname: str) -> AnalyzerResult:
    resolver = dns.asyncresolver.Resolver()
    resolver.timeout = 3
    resolver.lifetime = 4   # per-query cap; keeps total well inside ANALYZER_TIMEOUT_SECONDS

    # Run record type queries, mail-auth lookup, DNSSEC, and common DKIM selector checks concurrently.
    *type_results, dmarc_result, dnssec_result, dkim_result = await asyncio.gather(
        *[_query(resolver, hostname, rtype) for rtype in _RECORD_TYPES],
        _query(resolver, f"_dmarc.{hostname}", "TXT"),
        _query_dnssec(resolver, hostname),
        _query_dkim_selectors(resolver, hostname),
        return_exceptions=True,
    )
    results = type_results  # keep variable name for the loop below

    all_records: list[DnsRecord] = []
    for r in results:
        if isinstance(r, list):
            all_records.extend(r)

    txt_records = [r for r in all_records if r.type == "TXT"]

    dmarc_records: list[DnsRecord] = dmarc_result if isinstance(dmarc_result, list) else []
    dnssec_records: list[DnsRecord] = []
    dnssec_info = {
        "dnssecCheckedHost": hostname,
        "dnssecSigned": False,
        "dnssecDsRecords": [],
        "dnssecDnskeyRecords": [],
        "dnssecEvidence": [f"{hostname} DS: DNSSEC check unavailable"],
        "dnssecConfidence": "low",
    }
    if isinstance(dnssec_result, tuple):
        dnssec_records, dnssec_info = dnssec_result
    dkim_records: list[DnsRecord] = []
    dkim_info = {
        "dkimSelectorsChecked": list(_DKIM_SELECTORS),
        "dkimSelectorsFound": [],
        "dkimRecords": [],
        "dkimEvidence": [f"{hostname}: common DKIM selector check unavailable"],
    }
    if isinstance(dkim_result, tuple):
        dkim_records, dkim_info = dkim_result

    spf_records = _spf_records(txt_records)
    dmarc_policy_records = _dmarc_records(dmarc_records)
    spf_detected, spf_record     = bool(spf_records), spf_records[0] if spf_records else None
    dmarc_detected, dmarc_record = bool(dmarc_policy_records), dmarc_policy_records[0] if dmarc_policy_records else None
    spf_info = _parse_spf(spf_record)
    dmarc_info = _parse_dmarc(dmarc_record)
    mx_records = [r.value for r in all_records if r.type == "MX"]
    mx_dns_records = [r for r in all_records if r.type == "MX"]
    mx_providers = _detect_mx_providers(mx_records)
    dns_query_evidence = [
        f"{rtype}: {sum(1 for record in all_records if record.type == rtype)} record(s)"
        for rtype in _RECORD_TYPES
    ]
    dns_query_evidence.append(f"_dmarc TXT: {len(dmarc_records)} record(s)")
    dns_query_evidence.extend(dnssec_info["dnssecEvidence"])
    dns_query_evidence.append(f"dkim common selectors: {len(dkim_info['dkimSelectorsFound'])} selector(s) found")

    dns_result = DnsResult(
        records=all_records + dmarc_records + dnssec_records + dkim_records,
        mxDetected=bool(mx_records),
        mxRecords=mx_records,
        mxProviders=mx_providers,
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
        **dnssec_info,
        **dkim_info,
    )
    dns_result.emailSecurityConfidence = _email_security_confidence(dns_result)  # type: ignore[assignment]

    findings = _build_findings(dns_result, dmarc_record, hostname)

    return AnalyzerResult(key="dns", status="success", data=dns_result, findings=findings)
