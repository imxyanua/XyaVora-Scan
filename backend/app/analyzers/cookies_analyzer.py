import re
from http.cookiejar import http2time

import httpx

from app.schemas.report import CookieResult, Finding
from app.schemas.analyzer import AnalyzerResult
from app.utils.safe_fetch import fetch_headers_only


def _parse_set_cookie(header_value: str) -> CookieResult:
    """Parse a single Set-Cookie header string into a CookieResult."""
    parts = [p.strip() for p in header_value.split(";")]

    name = parts[0].split("=", 1)[0].strip() if parts else "unknown"

    attrs = {p.split("=", 1)[0].strip().lower(): (p.split("=", 1)[1].strip() if "=" in p else "") for p in parts[1:]}

    secure   = "secure"   in {p.split("=", 1)[0].strip().lower() for p in parts[1:]}
    httponly = "httponly" in {p.split("=", 1)[0].strip().lower() for p in parts[1:]}
    samesite = attrs.get("samesite") or None
    expires  = attrs.get("expires") or None
    max_age_str = attrs.get("max-age")
    max_age: int | None = None
    if max_age_str and max_age_str.lstrip("-").isdigit():
        max_age = int(max_age_str)

    warnings: list[str] = []
    if not secure:
        warnings.append("Missing Secure flag — cookie transmitted over HTTP")
    if not httponly:
        warnings.append("Missing HttpOnly flag — accessible via JavaScript (XSS risk)")
    if not samesite:
        warnings.append("Missing SameSite attribute — susceptible to CSRF")
    elif samesite.lower() == "none" and not secure:
        warnings.append("SameSite=None requires Secure flag")

    return CookieResult(
        name=name,
        secure=secure,
        httpOnly=httponly,
        sameSite=samesite,
        expires=expires,
        maxAge=max_age,
        warnings=warnings,
    )


def _build_findings(cookies: list[CookieResult]) -> list[Finding]:
    findings: list[Finding] = []

    if not cookies:
        findings.append(Finding(
            id="no_cookies",
            severity="info",
            category="Cookies",
            title="No Cookies Set",
            description="The server did not set any cookies on the initial request.",
            recommendation="No action required.",
            status="info",
            confidence="observed",
            source="headers",
            evidence=["No Set-Cookie headers were returned on the initial response."],
        ))
        return findings

    no_secure   = [c for c in cookies if not c.secure]
    no_httponly = [c for c in cookies if not c.httpOnly]
    no_samesite = [c for c in cookies if not c.sameSite]

    if no_secure:
        names = ", ".join(c.name for c in no_secure[:5])
        findings.append(Finding(
            id="cookie_no_secure",
            severity="medium",
            category="Cookies",
            title="Cookies Without Secure Flag",
            description=f"Cookie(s) missing the Secure flag: {names}.",
            impact="These cookies can be transmitted over unencrypted HTTP connections.",
            recommendation="Add the Secure flag to all cookies that do not need to work over HTTP.",
            status="fail",
            confidence="observed",
            source="headers",
            evidence=[f"{cookie.name}: Secure={cookie.secure}" for cookie in no_secure[:5]],
        ))

    if no_httponly:
        names = ", ".join(c.name for c in no_httponly[:5])
        findings.append(Finding(
            id="cookie_no_httponly",
            severity="medium",
            category="Cookies",
            title="Cookies Without HttpOnly Flag",
            description=f"Cookie(s) missing the HttpOnly flag: {names}.",
            impact="JavaScript can read these cookies — a successful XSS attack can steal session tokens.",
            recommendation="Add the HttpOnly flag to all session and authentication cookies.",
            status="fail",
            confidence="observed",
            source="headers",
            evidence=[f"{cookie.name}: HttpOnly={cookie.httpOnly}" for cookie in no_httponly[:5]],
        ))

    if no_samesite:
        names = ", ".join(c.name for c in no_samesite[:5])
        findings.append(Finding(
            id="cookie_no_samesite",
            severity="low",
            category="Cookies",
            title="Cookies Without SameSite Attribute",
            description=f"Cookie(s) missing the SameSite attribute: {names}.",
            impact="Without SameSite, cookies are sent on cross-site requests, enabling CSRF attacks.",
            recommendation="Set SameSite=Lax (or Strict for sensitive cookies) on all cookies.",
            status="warning",
            confidence="observed",
            source="headers",
            evidence=[f"{cookie.name}: SameSite={cookie.sameSite or 'missing'}" for cookie in no_samesite[:5]],
        ))

    if not findings:
        findings.append(Finding(
            id="cookies_ok",
            severity="info",
            category="Cookies",
            title="All Cookies Have Secure Attributes",
            description=f"All {len(cookies)} cookie(s) have Secure, HttpOnly, and SameSite set.",
            recommendation="No action required.",
            status="pass",
            confidence="observed",
            source="headers",
            evidence=[f"{cookie.name}: Secure={cookie.secure}, HttpOnly={cookie.httpOnly}, SameSite={cookie.sameSite}" for cookie in cookies[:5]],
        ))

    return findings


async def analyze_cookies(normalized_url: str) -> AnalyzerResult:
    try:
        response = await fetch_headers_only(normalized_url)
    except httpx.TimeoutException:
        return AnalyzerResult(
            key="cookies", status="error",
            data=[], findings=[],
            errors=["Request timed out"],
        )
    except httpx.RequestError as exc:
        return AnalyzerResult(
            key="cookies", status="error",
            data=[], findings=[],
            errors=[str(exc)],
        )

    raw_cookies = response.headers.get_list("set-cookie")
    cookies = [_parse_set_cookie(raw) for raw in raw_cookies]
    findings = _build_findings(cookies)
    return AnalyzerResult(key="cookies", status="success", data=cookies, findings=findings)
