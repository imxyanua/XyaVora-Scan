import re

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


def _build_findings(result: SecurityTxtResult) -> list[Finding]:
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
            evidence=["Checked /.well-known/security.txt and /security.txt without a usable response."],
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
        evidence=[f"location: {result.location}"] if result.location else [],
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
            evidence=[f"location: {result.location}", "Contact field not present in parsed security.txt"],
        ))

    return findings


async def analyze_security_txt(normalized_url: str) -> AnalyzerResult:
    timeout = httpx.Timeout(settings.FETCH_TIMEOUT_SECONDS)

    async with httpx.AsyncClient(
        follow_redirects=True,
        max_redirects=3,
        timeout=timeout,
        headers={"User-Agent": _USER_AGENT},
    ) as client:
        for path in _PATHS:
            url = normalized_url.rstrip("/") + path
            try:
                resp = await client.get(url)
            except (httpx.TimeoutException, httpx.RequestError):
                continue

            if resp.status_code == 200 and resp.text.strip():
                fields = _parse_security_txt(resp.text)
                result = SecurityTxtResult(
                    present=True,
                    location=url,
                    contact=fields["contact"],
                    policy=fields["policy"],
                    encryption=fields["encryption"],
                    expires=fields["expires"],
                    raw=resp.text[:2000],
                )
                findings = _build_findings(result)
                return AnalyzerResult(
                    key="securityTxt", status="success",
                    data=result, findings=findings,
                )

    result = SecurityTxtResult(present=False)
    findings = _build_findings(result)
    return AnalyzerResult(key="securityTxt", status="success", data=result, findings=findings)
