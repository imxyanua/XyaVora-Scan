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

    return WhoisResult(
        registrar=registrar or None,
        createdDate=_to_iso(data.get("creation_date")),
        updatedDate=_to_iso(data.get("updated_date")),
        expiryDate=_to_iso(data.get("expiration_date")),
        nameServers=name_servers,
        dnssec=dnssec or None,
    )


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
        ))
        return findings

    # Expiry check
    if result.expiryDate:
        try:
            expiry = datetime.fromisoformat(result.expiryDate)
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            days_left = (expiry - datetime.now(timezone.utc)).days

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
                ))
        except (ValueError, TypeError):
            pass

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
