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
        "finding_impact": "An attacker on the same network could intercept traffic via SSL stripping.",
        "finding_rec": "Send Strict-Transport-Security with a long max-age. Add includeSubDomains and preload only after confirming every subdomain supports HTTPS.",
        "severity": "high",
        "fail_status": "fail",
    },
    {
        "header": "Content-Security-Policy",
        "description": "Restricts allowed content sources, mitigating XSS and data injection.",
        "finding_id": "missing_csp",
        "finding_title": "Content Security Policy Is Missing",
        "finding_desc": "The site does not send a Content-Security-Policy header, so browsers have fewer controls against injected content.",
        "finding_impact": "Attackers can inject malicious scripts that execute in users' browsers (XSS).",
        "finding_rec": "Start with a report-only CSP, review violations, then enforce a policy such as default-src 'self' and explicit script/style sources.",
        "severity": "high",
        "fail_status": "fail",
    },
    {
        "header": "X-Frame-Options",
        "description": "Prevents the page from being embedded in an iframe (clickjacking protection).",
        "finding_id": "missing_x_frame",
        "finding_title": "Clickjacking Protection Is Missing",
        "finding_desc": "The site does not send X-Frame-Options, so pages may be embedded by other sites.",
        "finding_impact": "Clickjacking attacks can trick users into clicking hidden UI elements.",
        "finding_rec": "Send X-Frame-Options: DENY, or SAMEORIGIN if legitimate same-site framing is required.",
        "severity": "medium",
        "fail_status": "fail",
    },
    {
        "header": "X-Content-Type-Options",
        "description": "Prevents browsers from MIME-sniffing responses away from the declared content type.",
        "finding_id": "missing_xcto",
        "finding_title": "MIME Sniffing Protection Is Missing",
        "finding_desc": "The site does not send X-Content-Type-Options, so browsers may guess content types.",
        "finding_impact": "Browsers may execute files with wrong content types, enabling drive-by download attacks.",
        "finding_rec": "Send X-Content-Type-Options: nosniff on HTML, script, style, and downloadable responses.",
        "severity": "medium",
        "fail_status": "fail",
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
    },
]


def _check_headers(
    raw_headers: httpx.Headers,
) -> tuple[list[SecurityHeaderItem], list[Finding]]:
    items: list[SecurityHeaderItem] = []
    findings: list[Finding] = []

    for rule in _HEADER_RULES:
        key = rule["header"].lower()
        value = raw_headers.get(key)

        if value:
            items.append(SecurityHeaderItem(
                header=rule["header"],
                status="present",
                value=value,
                description=rule["description"],
            ))
        else:
            items.append(SecurityHeaderItem(
                header=rule["header"],
                status="missing",
                description=rule["description"],
            ))
            findings.append(Finding(
                id=rule["finding_id"],
                severity=rule["severity"],   # type: ignore[arg-type]
                category="Headers",
                title=rule["finding_title"],
                description=rule["finding_desc"],
                impact=rule["finding_impact"],
                recommendation=rule["finding_rec"],
                status=rule["fail_status"],  # type: ignore[arg-type]
            ))

    return items, findings


def _server_finding(server: str) -> Finding:
    return Finding(
        id="server_exposed",
        severity="low",
        category="Headers",
        title="Server Technology Is Exposed",
        description=f"The Server header reveals web server software: '{server}'.",
        impact="Attackers can target known vulnerabilities for the identified server version.",
        recommendation="Configure the server to suppress or obfuscate the Server header.",
        status="warning",
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
