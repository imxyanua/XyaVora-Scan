import asyncio
from datetime import datetime, timezone

import whois

from app.schemas.report import WhoisResult, Finding
from app.schemas.analyzer import AnalyzerResult

# Warn when domain expires within this many days
_EXPIRY_WARN_DAYS = 60


def _get_whois(hostname: str) -> whois.WhoisEntry:
    """Blocking whois lookup — runs in a thread via asyncio.to_thread."""
    return whois.whois(hostname)


def _to_iso(value) -> str | None:
    """Normalise whois date fields (can be datetime, list, or str) to ISO 8601."""
    if value is None:
        return None
    if isinstance(value, list):
        value = value[0]
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value)


def _days_until(value: str | None) -> int | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (dt - datetime.now(timezone.utc)).days


def _evidence(result: WhoisResult) -> list[str]:
    evidence: list[str] = []
    if result.registrar:
        evidence.append(f"registrar: {result.registrar}")
    if result.createdDate:
        evidence.append(f"created: {result.createdDate}")
    if result.updatedDate:
        evidence.append(f"updated: {result.updatedDate}")
    if result.expiryDate:
        evidence.append(f"expires: {result.expiryDate}")
    if result.expiryDaysRemaining is not None:
        evidence.append(f"expiry_days_remaining: {result.expiryDaysRemaining}")
    if result.dnssec:
        evidence.append(f"dnssec: {result.dnssec}")
    if result.nameServers:
        evidence.append(f"name_servers: {', '.join(result.nameServers[:6])}")
    return evidence


def _parse_whois(data: whois.WhoisEntry) -> WhoisResult:
    registrar = data.get("registrar")
    if isinstance(registrar, list):
        registrar = registrar[0]

    name_servers = data.get("name_servers") or []
    if isinstance(name_servers, str):
        name_servers = [name_servers]
    name_servers = sorted({ns.lower().rstrip(".") for ns in name_servers})

    dnssec = data.get("dnssec")
    if isinstance(dnssec, list):
        dnssec = dnssec[0]
    if dnssec:
        dnssec = str(dnssec)

    result = WhoisResult(
        registrar=registrar or None,
        createdDate=_to_iso(data.get("creation_date")),
        updatedDate=_to_iso(data.get("updated_date")),
        expiryDate=_to_iso(data.get("expiration_date")),
        nameServers=name_servers,
        dnssec=dnssec or None,
    )
    result.expiryDaysRemaining = _days_until(result.expiryDate)
    result.whoisEvidence = _evidence(result)
    return result


def _whois_verification() -> str:
    return "Query the domain through the registrar, RDAP, or a WHOIS client and compare registrar, expiry, nameserver, and DNSSEC fields."


def _build_findings(result: WhoisResult) -> list[Finding]:
    findings: list[Finding] = []

    if result.error:
        findings.append(Finding(
            id="whois_unavailable",
            severity="info",
            category="WHOIS",
            title="WHOIS Data Unavailable",
            description=f"Could not retrieve WHOIS data: {result.error}",
            recommendation="This may be due to WHOIS privacy protection or query rate limits. Try again later.",
            status="info",
            confidence="observed",
            source="whois",
            evidence=[f"whois_error: {result.error}"],
            analysis="The WHOIS lookup raised an error or returned data the scanner could not parse.",
            verification=_whois_verification(),
        ))
        return findings

    # Expiry check
    if result.expiryDate:
        try:
            days_left = result.expiryDaysRemaining
            if days_left is None:
                raise ValueError("Could not parse expiration date")

            if days_left < 0:
                findings.append(Finding(
                    id="domain_expired",
                    severity="high",
                    category="WHOIS",
                    title="Domain Registration Expired",
                    description=f"Domain expired {abs(days_left)} day(s) ago on {result.expiryDate[:10]}.",
                    impact="Expired domains can be registered by anyone and used for phishing or brand abuse.",
                    recommendation="Renew the domain registration immediately.",
                    status="fail",
                    confidence="verified",
                    source="whois",
                    evidence=result.whoisEvidence,
                    analysis="The parsed WHOIS expiration date is earlier than the scan time.",
                    verification=_whois_verification(),
                ))
            elif days_left < _EXPIRY_WARN_DAYS:
                findings.append(Finding(
                    id="domain_expiring_soon",
                    severity="medium",
                    category="WHOIS",
                    title=f"Domain Expiring Soon ({days_left} days)",
                    description=f"Domain registration expires on {result.expiryDate[:10]}.",
                    impact="If not renewed, the domain will become available for others to register.",
                    recommendation="Renew the domain registration before expiry and enable auto-renew.",
                    status="warning",
                    confidence="verified",
                    source="whois",
                    evidence=result.whoisEvidence,
                    analysis=f"The parsed WHOIS expiration date is within the {_EXPIRY_WARN_DAYS}-day renewal window.",
                    verification=_whois_verification(),
                ))
            else:
                findings.append(Finding(
                    id="domain_registration_ok",
                    severity="info",
                    category="WHOIS",
                    title=f"Domain Registration Valid ({days_left} days remaining)",
                    description=f"Registration expires {result.expiryDate[:10]}.",
                    recommendation="No action required. Monitor expiration date.",
                    status="pass",
                    confidence="verified",
                    source="whois",
                    evidence=result.whoisEvidence,
                    analysis="The parsed WHOIS expiration date is in the future and outside the warning window.",
                    verification=_whois_verification(),
                ))
        except (ValueError, TypeError):
            pass
    else:
        findings.append(Finding(
            id="domain_expiry_unknown",
            severity="info",
            category="WHOIS",
            title="Domain Expiration Date Unknown",
            description="WHOIS did not return a usable expiration date.",
            recommendation="Check the registrar directly if expiration monitoring matters for this domain.",
            status="info",
            confidence="observed",
            source="whois",
            evidence=result.whoisEvidence,
            analysis="The WHOIS response did not include an expiration date the scanner could normalize.",
            verification=_whois_verification(),
        ))

    # DNSSEC check
    if result.dnssec and result.dnssec.lower() not in ("unsigned", "no", "false"):
        findings.append(Finding(
            id="dnssec_enabled",
            severity="info",
            category="WHOIS",
            title="DNSSEC Is Enabled",
            description=f"DNSSEC status: {result.dnssec}.",
            recommendation="No action required.",
            status="pass",
            confidence="verified",
            source="whois",
            evidence=result.whoisEvidence,
            analysis="The WHOIS/RDAP data reported a DNSSEC value that is not unsigned/no/false.",
            verification=_whois_verification(),
        ))
    else:
        findings.append(Finding(
            id="dnssec_not_enabled",
            severity="low",
            category="WHOIS",
            title="DNSSEC Not Enabled",
            description="DNSSEC is not enabled or could not be confirmed.",
            impact="Without DNSSEC, DNS responses can be spoofed (DNS cache poisoning).",
            recommendation="Enable DNSSEC through your registrar or DNS provider.",
            status="warning",
            confidence="observed",
            source="whois",
            evidence=result.whoisEvidence,
            analysis="WHOIS/RDAP did not confirm DNSSEC as enabled.",
            verification=_whois_verification(),
        ))

    return findings


async def analyze_whois(hostname: str) -> AnalyzerResult:
    try:
        data = await asyncio.to_thread(_get_whois, hostname)
        result = _parse_whois(data)
    except Exception as exc:
        result = WhoisResult(error=str(exc))

    findings = _build_findings(result)
    return AnalyzerResult(key="whois", status="success", data=result, findings=findings)
