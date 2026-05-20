import re
from datetime import datetime, timezone

import httpx

from app.schemas.report import SecurityTxtResult, Finding
from app.schemas.analyzer import AnalyzerResult
from app.core.config import settings

_USER_AGENT = "XyaVora-Scan/0.1 (passive-security-scanner; not a browser)"

# RFC 9116 — well-known location is preferred; fallback to root path
_PATHS = ["/.well-known/security.txt", "/security.txt"]


def _parse_security_txt(text: str) -> dict:
    """Extract known fields from security.txt content."""
    fields: dict[str, str | None] = {
        "contact":    None,
        "policy":     None,
        "encryption": None,
        "expires":    None,
    }
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("#") or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key   = key.strip().lower()
        value = value.strip()
        if key == "contact" and not fields["contact"]:
            fields["contact"] = value
        elif key == "policy" and not fields["policy"]:
            fields["policy"] = value
        elif key in ("encryption", "canonical") and not fields["encryption"]:
            fields["encryption"] = value
        elif key == "expires" and not fields["expires"]:
            fields["expires"] = value
    return fields


def _expires_is_expired(value: str | None) -> bool:
    if not value:
        return False
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed < datetime.now(timezone.utc)


def _evidence(result: SecurityTxtResult) -> list[str]:
    evidence = [
        f"present: {result.present}",
        *[f"checked: {location}" for location in result.checkedLocations],
    ]
    if result.location:
        evidence.append(f"location: {result.location}")
    for label, value in (
        ("contact", result.contact),
        ("policy", result.policy),
        ("encryption", result.encryption),
        ("expires", result.expires),
    ):
        evidence.append(f"{label}: {value or 'missing'}")
    evidence.append(f"expired: {result.expired}")
    return evidence


def _build_findings(result: SecurityTxtResult) -> list[Finding]:
    evidence = result.securityTxtEvidence or _evidence(result)
    if not result.present:
        return [Finding(
            id="no_security_txt",
            severity="low",
            category="Security.txt",
            title="security.txt Not Found",
            description="No security.txt file was found at /.well-known/security.txt or /security.txt.",
            impact="Security researchers have no standardised way to report vulnerabilities to the organisation.",
            recommendation=(
                "Create a security.txt file at /.well-known/security.txt following RFC 9116. "
                "Include at minimum a Contact field."
            ),
            status="warning",
            confidence="observed",
            source="http",
            evidence=evidence,
        )]

    findings = [Finding(
        id="security_txt_present",
        severity="info",
        category="Security.txt",
        title="security.txt Is Present",
        description=f"Found at {result.location}.",
        recommendation="Keep the file up-to-date, especially the Expires field.",
        status="pass",
        confidence="verified",
        source="http",
        evidence=evidence,
    )]

    if not result.contact:
        findings.append(Finding(
            id="security_txt_no_contact",
            severity="low",
            category="Security.txt",
            title="security.txt Missing Contact Field",
            description="The security.txt file does not contain a Contact field.",
            impact="Researchers cannot identify where to report vulnerabilities.",
            recommendation="Add 'Contact: mailto:security@example.com' or a URL to your security policy.",
            status="warning",
            confidence="observed",
            source="http",
            evidence=evidence,
        ))

    if not result.expires:
        findings.append(Finding(
            id="security_txt_no_expires",
            severity="low",
            category="Security.txt",
            title="security.txt Missing Expires Field",
            description="The security.txt file does not contain an Expires field.",
            impact="Researchers cannot tell whether the published contact information is still current.",
            recommendation="Add an Expires field and keep it updated before the timestamp passes.",
            status="warning",
            confidence="observed",
            source="http",
            evidence=evidence,
        ))
    elif result.expired:
        findings.append(Finding(
            id="security_txt_expired",
            severity="low",
            category="Security.txt",
            title="security.txt Is Expired",
            description=f"The security.txt Expires field is in the past: {result.expires}.",
            impact="Researchers may not trust stale reporting instructions.",
            recommendation="Refresh the security.txt file and set a future Expires value.",
            status="warning",
            confidence="verified",
            source="http",
            evidence=evidence,
        ))

    return findings


async def analyze_security_txt(normalized_url: str) -> AnalyzerResult:
    timeout = httpx.Timeout(settings.FETCH_TIMEOUT_SECONDS)
    checked_locations: list[str] = []

    async with httpx.AsyncClient(
        follow_redirects=True,
        max_redirects=3,
        timeout=timeout,
        headers={"User-Agent": _USER_AGENT},
    ) as client:
        for path in _PATHS:
            url = normalized_url.rstrip("/") + path
            checked_locations.append(url)
            try:
                resp = await client.get(url)
            except (httpx.TimeoutException, httpx.RequestError):
                continue

            if resp.status_code == 200 and resp.text.strip():
                fields = _parse_security_txt(resp.text)
                raw_url = getattr(resp, "url", None)
                final_url = str(raw_url) if isinstance(raw_url, (str, httpx.URL)) else url
                result = SecurityTxtResult(
                    present=True,
                    location=final_url,
                    checkedLocations=checked_locations,
                    contact=fields["contact"],
                    policy=fields["policy"],
                    encryption=fields["encryption"],
                    expires=fields["expires"],
                    expired=_expires_is_expired(fields["expires"]),
                    raw=resp.text[:2000],
                )
                result.securityTxtEvidence = _evidence(result)
                findings = _build_findings(result)
                return AnalyzerResult(
                    key="securityTxt", status="success",
                    data=result, findings=findings,
                )

    result = SecurityTxtResult(present=False, checkedLocations=checked_locations)
    result.securityTxtEvidence = _evidence(result)
    findings = _build_findings(result)
    return AnalyzerResult(key="securityTxt", status="success", data=result, findings=findings)
