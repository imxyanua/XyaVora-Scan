import re

import httpx

from app.schemas.report import HeadersResult, SecurityHeaderItem, Finding
from app.schemas.analyzer import AnalyzerResult
from app.utils.safe_fetch import fetch_headers_only


# Ordered by security impact. Each entry defines what to check and what
# finding to produce when the header is absent or misconfigured.
_HEADER_RULES: list[dict] = [
    {
        "header": "Strict-Transport-Security",
        "description": "Enforces HTTPS and prevents SSL-stripping downgrade attacks.",
        "finding_id": "missing_hsts",
        "finding_title": "HSTS Is Not Enabled",
        "finding_desc": "The site does not send Strict-Transport-Security, so browsers are not told to always use HTTPS.",
        "finding_impact": "Users are not pinned to HTTPS after the first visit, which weakens downgrade protection.",
        "finding_rec": "Send Strict-Transport-Security with a long max-age. Add includeSubDomains and preload only after confirming every subdomain supports HTTPS.",
        "severity": "medium",
        "fail_status": "warning",
        "confidence": "best-practice",
    },
    {
        "header": "Content-Security-Policy",
        "description": "Restricts allowed content sources, mitigating XSS and data injection.",
        "finding_id": "missing_csp",
        "finding_title": "Content Security Policy Is Missing",
        "finding_desc": "The site does not send a Content-Security-Policy header, so browsers have fewer controls against injected content.",
        "finding_impact": "If an injection bug exists elsewhere, the browser has fewer policy controls to limit script execution.",
        "finding_rec": "Start with a report-only CSP, review violations, then enforce a policy such as default-src 'self' and explicit script/style sources.",
        "severity": "medium",
        "fail_status": "warning",
        "confidence": "best-practice",
    },
    {
        "header": "X-Frame-Options",
        "description": "Prevents the page from being embedded in an iframe (clickjacking protection).",
        "finding_id": "missing_x_frame",
        "finding_title": "Clickjacking Protection Is Missing",
        "finding_desc": "The site does not send X-Frame-Options, so pages may be embedded by other sites.",
        "finding_impact": "Clickjacking attacks can trick users into clicking hidden UI elements.",
        "finding_rec": "Send X-Frame-Options: DENY, or SAMEORIGIN if legitimate same-site framing is required.",
        "severity": "low",
        "fail_status": "warning",
        "confidence": "best-practice",
    },
    {
        "header": "X-Content-Type-Options",
        "description": "Prevents browsers from MIME-sniffing responses away from the declared content type.",
        "finding_id": "missing_xcto",
        "finding_title": "MIME Sniffing Protection Is Missing",
        "finding_desc": "The site does not send X-Content-Type-Options, so browsers may guess content types.",
        "finding_impact": "Browsers may execute files with wrong content types, enabling drive-by download attacks.",
        "finding_rec": "Send X-Content-Type-Options: nosniff on HTML, script, style, and downloadable responses.",
        "severity": "low",
        "fail_status": "warning",
        "confidence": "best-practice",
    },
    {
        "header": "Referrer-Policy",
        "description": "Controls how much referrer information is sent with navigation requests.",
        "finding_id": "missing_referrer",
        "finding_title": "Referrer Policy Is Missing",
        "finding_desc": "The site does not send Referrer-Policy, so browsers use their default referrer behavior.",
        "finding_impact": "Sensitive URL parameters may be exposed to third-party sites via the Referer header.",
        "finding_rec": "Send Referrer-Policy: strict-origin-when-cross-origin for a balanced default.",
        "severity": "low",
        "fail_status": "warning",
        "confidence": "best-practice",
    },
    {
        "header": "Permissions-Policy",
        "description": "Restricts browser feature access (camera, microphone, geolocation, etc.).",
        "finding_id": "missing_permissions",
        "finding_title": "Browser Feature Policy Is Missing",
        "finding_desc": "The site does not send Permissions-Policy, so sensitive browser capabilities are not explicitly restricted.",
        "finding_impact": "Embedded scripts could silently access camera, microphone, or location without restriction.",
        "finding_rec": "Send Permissions-Policy and disable unused features, for example geolocation=(), camera=(), microphone=().",
        "severity": "low",
        "fail_status": "warning",
        "confidence": "best-practice",
    },
]

_HSTS_MIN_AGE = 15_552_000  # 180 days


def _short(value: str, limit: int = 120) -> str:
    value = " ".join(value.split())
    return value if len(value) <= limit else f"{value[:limit - 3]}..."


def _present_item(rule: dict, value: str) -> tuple[SecurityHeaderItem, Finding | None]:
    header = rule["header"]
    confidence = "high"
    status = "present"
    warning: Finding | None = None
    evidence = [f"{header}: {_short(value)}"]

    lower = value.lower()
    if header == "Strict-Transport-Security":
        max_age = _hsts_max_age(lower)
        if max_age is None or max_age < _HSTS_MIN_AGE:
            status = "warning"
            confidence = "medium"
            warning = Finding(
                id="weak_hsts",
                severity="medium",
                category="Headers",
                title="HSTS Max-Age Is Too Short",
                description=f"HSTS is present, but max-age is lower than the recommended 180 days: {value}",
                impact="Browsers may stop enforcing HTTPS sooner than expected.",
                recommendation="Use Strict-Transport-Security with max-age of at least 15552000 seconds after validating HTTPS coverage.",
                status="warning",
                confidence="observed",
                source="headers",
                evidence=evidence,
            )
    elif header == "Content-Security-Policy":
        if "unsafe-inline" in lower or "*" in lower:
            status = "warning"
            confidence = "medium"
            warning = Finding(
                id="weak_csp",
                severity="medium",
                category="Headers",
                title="Content Security Policy Is Too Permissive",
                description=f"CSP is present, but contains broad or unsafe directives: {value}",
                impact="A permissive CSP gives browsers less protection against injected scripts.",
                recommendation="Remove unsafe-inline and wildcard sources where possible. Prefer explicit trusted sources and nonces/hashes.",
                status="warning",
                confidence="observed",
                source="headers",
                evidence=evidence,
            )
    elif header == "X-Frame-Options":
        if lower not in ("deny", "sameorigin"):
            status = "warning"
            confidence = "medium"
            warning = Finding(
                id="weak_x_frame",
                severity="low",
                category="Headers",
                title="X-Frame-Options Value Is Not Recognized",
                description=f"X-Frame-Options is present but has an unexpected value: {value}",
                impact="Browsers may ignore the header and allow framing.",
                recommendation="Use X-Frame-Options: DENY or SAMEORIGIN.",
                status="warning",
                confidence="observed",
                source="headers",
                evidence=evidence,
            )
    elif header == "X-Content-Type-Options":
        if lower != "nosniff":
            status = "warning"
            confidence = "medium"
            warning = Finding(
                id="weak_xcto",
                severity="low",
                category="Headers",
                title="X-Content-Type-Options Is Not nosniff",
                description=f"X-Content-Type-Options is present but not set to nosniff: {value}",
                impact="Browsers may still MIME-sniff responses.",
                recommendation="Use X-Content-Type-Options: nosniff.",
                status="warning",
                confidence="observed",
                source="headers",
                evidence=evidence,
            )
    elif header == "Referrer-Policy":
        if lower in ("unsafe-url", "no-referrer-when-downgrade"):
            status = "warning"
            confidence = "medium"
            warning = Finding(
                id="weak_referrer_policy",
                severity="low",
                category="Headers",
                title="Referrer Policy May Leak Too Much Detail",
                description=f"Referrer-Policy is present but permissive: {value}",
                impact="Full URLs may be sent to third-party origins.",
                recommendation="Use strict-origin-when-cross-origin, same-origin, or no-referrer depending on product needs.",
                status="warning",
                confidence="observed",
                source="headers",
                evidence=evidence,
            )

    return SecurityHeaderItem(
        header=header,
        status=status,  # type: ignore[arg-type]
        value=value,
        description=rule["description"],
        confidence=confidence,  # type: ignore[arg-type]
        evidence=evidence,
    ), warning


def _missing_item(rule: dict) -> SecurityHeaderItem:
    return SecurityHeaderItem(
        header=rule["header"],
        status="missing",
        description=rule["description"],
        confidence="high",
        evidence=[f"{rule['header']}: not present in response headers"],
    )


def _hsts_max_age(value: str) -> int | None:
    match = re.search(r"(?:^|;)\s*max-age\s*=\s*(\d+)", value)
    if not match:
        return None
    try:
        return int(match.group(1))
    except ValueError:
        return None


def _check_headers(
    raw_headers: httpx.Headers,
) -> tuple[list[SecurityHeaderItem], list[Finding]]:
    items: list[SecurityHeaderItem] = []
    findings: list[Finding] = []

    for rule in _HEADER_RULES:
        key = rule["header"].lower()
        value = raw_headers.get(key)

        if value:
            item, warning = _present_item(rule, value)
            items.append(item)
            if warning:
                findings.append(warning)
        else:
            items.append(_missing_item(rule))
            findings.append(Finding(
                id=rule["finding_id"],
                severity=rule["severity"],   # type: ignore[arg-type]
                category="Headers",
                title=rule["finding_title"],
                description=rule["finding_desc"],
                impact=rule["finding_impact"],
                recommendation=rule["finding_rec"],
                status=rule["fail_status"],  # type: ignore[arg-type]
                confidence=rule.get("confidence", "observed"),
                source="headers",
                evidence=[f"{rule['header']}: not present in response headers"],
            ))

    return items, findings


def _server_finding(server: str) -> Finding:
    return Finding(
        id="server_exposed",
        severity="info",
        category="Headers",
        title="Server Technology Is Exposed",
        description=f"The Server header reveals web server software: '{server}'.",
        impact="This is fingerprinting information only. It is not a confirmed vulnerability by itself.",
        recommendation="Configure the server to suppress or obfuscate the Server header.",
        status="info",
        confidence="observed",
        source="headers",
        evidence=[f"Server: {server}"],
    )


async def analyze_headers(normalized_url: str) -> AnalyzerResult:
    try:
        response = await fetch_headers_only(normalized_url)
    except httpx.TimeoutException:
        return AnalyzerResult(
            key="headers", status="error",
            errors=[f"Request timed out: {normalized_url}"],
        )
    except httpx.RequestError as exc:
        return AnalyzerResult(
            key="headers", status="error",
            errors=[f"Request failed: {exc}"],
        )

    headers = response.headers
    security_items, findings = _check_headers(headers)

    server = headers.get("server")
    x_powered_by = headers.get("x-powered-by")

    if server:
        findings.append(_server_finding(server))

    redirect_detected = str(response.url) != normalized_url

    result = HeadersResult(
        statusCode=response.status_code,
        finalUrl=str(response.url),
        redirectDetected=redirect_detected,
        server=server,
        xPoweredBy=x_powered_by,
        securityHeaders=security_items,
    )

    return AnalyzerResult(key="headers", status="success", data=result, findings=findings)
