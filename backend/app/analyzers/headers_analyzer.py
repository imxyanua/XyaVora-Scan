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
        "finding_title": "HSTS Header Not Observed",
        "finding_desc": "The final response does not send Strict-Transport-Security, so browsers are not instructed to pin this host to HTTPS.",
        "finding_impact": "This reduces browser-side downgrade protection after the first visit. It is a hardening gap, not proof of an active downgrade issue.",
        "finding_rec": "Send Strict-Transport-Security with a long max-age. Add includeSubDomains and preload only after confirming every subdomain supports HTTPS.",
        "severity": "medium",
        "fail_status": "warning",
        "confidence": "best-practice",
    },
    {
        "header": "Content-Security-Policy",
        "description": "Restricts allowed content sources, mitigating XSS and data injection.",
        "finding_id": "missing_csp",
        "finding_title": "Content Security Policy Not Observed",
        "finding_desc": "The final response does not send a Content-Security-Policy header, so browsers receive fewer content execution controls.",
        "finding_impact": "If an injection issue exists elsewhere, CSP would provide less browser-side containment. This is a defense-in-depth recommendation.",
        "finding_rec": "Start with a report-only CSP, review violations, then enforce a policy such as default-src 'self' and explicit script/style sources.",
        "severity": "medium",
        "fail_status": "warning",
        "confidence": "best-practice",
    },
    {
        "header": "X-Frame-Options",
        "description": "Prevents the page from being embedded in an iframe (clickjacking protection).",
        "finding_id": "missing_x_frame",
        "finding_title": "Frame Embedding Control Not Observed",
        "finding_desc": "The final response does not send X-Frame-Options, so older browser frame controls are not explicitly set.",
        "finding_impact": "Pages may rely on CSP frame-ancestors or app-specific controls instead. Without either control, clickjacking resistance is weaker.",
        "finding_rec": "Send X-Frame-Options: DENY, or SAMEORIGIN if legitimate same-site framing is required.",
        "severity": "low",
        "fail_status": "warning",
        "confidence": "best-practice",
    },
    {
        "header": "X-Content-Type-Options",
        "description": "Prevents browsers from MIME-sniffing responses away from the declared content type.",
        "finding_id": "missing_xcto",
        "finding_title": "MIME Sniffing Control Not Observed",
        "finding_desc": "The final response does not send X-Content-Type-Options, so compatible browsers may still apply content sniffing behavior.",
        "finding_impact": "This can weaken content-type enforcement on mislabelled responses. It does not prove that a dangerous file is currently exposed.",
        "finding_rec": "Send X-Content-Type-Options: nosniff on HTML, script, style, and downloadable responses.",
        "severity": "low",
        "fail_status": "warning",
        "confidence": "best-practice",
    },
    {
        "header": "Referrer-Policy",
        "description": "Controls how much referrer information is sent with navigation requests.",
        "finding_id": "missing_referrer",
        "finding_title": "Referrer Policy Not Observed",
        "finding_desc": "The final response does not send Referrer-Policy, so browsers fall back to their default referrer behavior.",
        "finding_impact": "Modern browser defaults are usually safer than older defaults, but an explicit policy gives the site clearer privacy control.",
        "finding_rec": "Send Referrer-Policy: strict-origin-when-cross-origin for a balanced default.",
        "severity": "low",
        "fail_status": "warning",
        "confidence": "best-practice",
    },
    {
        "header": "Permissions-Policy",
        "description": "Restricts browser feature access (camera, microphone, geolocation, etc.).",
        "finding_id": "missing_permissions",
        "finding_title": "Browser Feature Policy Not Observed",
        "finding_desc": "The final response does not send Permissions-Policy, so unused browser capabilities are not explicitly disabled by policy.",
        "finding_impact": "Browser permission prompts and same-origin rules still apply, but an explicit policy can reduce feature exposure for embedded content.",
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


def _has_broad_csp_source(value: str) -> bool:
    return bool(re.search(r"(?:^|[\s;])\*(?:[\s;]|$)", value))


def _parse_csp_directives(value: str) -> dict[str, list[str]]:
    directives: dict[str, list[str]] = {}
    for raw_directive in value.split(";"):
        parts = raw_directive.strip().split()
        if not parts:
            continue
        name = parts[0].lower()
        sources = [part.strip() for part in parts[1:]]
        directives[name] = sources
    return directives


def _csp_sources_for(directives: dict[str, list[str]], directive: str) -> list[str]:
    return directives.get(directive, directives.get("default-src", []))


def _csp_has_token(sources: list[str], token: str) -> bool:
    token = token.lower()
    return any(source.lower() == token for source in sources)


def _csp_has_broad_source(directives: dict[str, list[str]]) -> bool:
    for sources in directives.values():
        for source in sources:
            lower = source.lower()
            if lower in {"*", "http:", "https:", "data:", "blob:"}:
                return True
            if lower.startswith("*."):
                return True
    return False


def _csp_audit(value: str) -> dict:
    directives = _parse_csp_directives(value)
    script_sources = _csp_sources_for(directives, "script-src")
    object_sources = _csp_sources_for(directives, "object-src")
    base_uri_sources = directives.get("base-uri", [])
    frame_ancestors = directives.get("frame-ancestors", [])
    has_default_src = "default-src" in directives
    unsafe_inline = _csp_has_token(script_sources, "'unsafe-inline'")
    unsafe_eval = _csp_has_token(script_sources, "'unsafe-eval'")
    object_locked = _csp_has_token(object_sources, "'none'")
    base_uri_locked = _csp_has_token(base_uri_sources, "'none'") or _csp_has_token(base_uri_sources, "'self'")
    frame_controlled = bool(frame_ancestors)
    broad_source = _csp_has_broad_source(directives)

    issues: list[str] = []
    if not has_default_src:
        issues.append("missing-default-src")
    if unsafe_inline:
        issues.append("unsafe-inline")
    if unsafe_eval:
        issues.append("unsafe-eval")
    if broad_source:
        issues.append("broad-source")
    if not object_locked:
        issues.append("object-src-not-locked")
    if not base_uri_locked:
        issues.append("base-uri-not-locked")

    return {
        "directives": directives,
        "has_default_src": has_default_src,
        "script_sources": script_sources,
        "object_sources": object_sources,
        "base_uri_sources": base_uri_sources,
        "frame_ancestors": frame_ancestors,
        "unsafe_inline": unsafe_inline,
        "unsafe_eval": unsafe_eval,
        "broad_source": broad_source,
        "object_locked": object_locked,
        "base_uri_locked": base_uri_locked,
        "frame_controlled": frame_controlled,
        "issues": issues,
    }


def _header_verification(header: str) -> str:
    return f"Run curl -I against the final URL and inspect the {header} response header after redirects."


def _missing_header_evidence(header: str) -> list[str]:
    return [
        f"{header}: not present in response headers",
        "scope: final HTTP response after redirects",
        "interpretation: hardening recommendation, not a confirmed exploit",
    ]


def _present_item(rule: dict, value: str) -> tuple[SecurityHeaderItem, Finding | None]:
    header = rule["header"]
    confidence = "high"
    status = "present"
    warning: Finding | None = None
    evidence = [f"{header}: {_short(value)}"]

    lower = value.lower()
    if header == "Strict-Transport-Security":
        max_age = _hsts_max_age(lower)
        evidence.append(f"hsts.max_age: {max_age if max_age is not None else 'missing'}")
        evidence.append(f"hsts.include_subdomains: {'includesubdomains' in lower}")
        evidence.append(f"hsts.preload: {'preload' in lower}")
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
                analysis="The header is present, but the observed max-age is missing or below the scanner's 180-day baseline.",
                verification=_header_verification(header),
                classification="observed-risk",
            )
    elif header == "Content-Security-Policy":
        csp = _csp_audit(value)
        has_unsafe_inline = csp["unsafe_inline"]
        has_broad_source = csp["broad_source"] or _has_broad_csp_source(lower)
        evidence.extend([
            f"csp.default_src_present: {csp['has_default_src']}",
            f"csp.script_src: {' '.join(csp['script_sources']) or 'fallback-or-missing'}",
            f"csp.object_src: {' '.join(csp['object_sources']) or 'fallback-or-missing'}",
            f"csp.base_uri: {' '.join(csp['base_uri_sources']) or 'missing'}",
            f"csp.frame_ancestors: {' '.join(csp['frame_ancestors']) or 'missing'}",
            f"csp.unsafe_inline: {has_unsafe_inline}",
            f"csp.unsafe_eval: {csp['unsafe_eval']}",
            f"csp.broad_source: {has_broad_source}",
            f"csp.object_src_locked: {csp['object_locked']}",
            f"csp.base_uri_locked: {csp['base_uri_locked']}",
            f"csp.issues: {', '.join(csp['issues']) if csp['issues'] else 'none'}",
        ])
        if csp["issues"] or has_broad_source:
            status = "warning"
            confidence = "medium"
            warning = Finding(
                id="weak_csp",
                severity="medium",
                category="Headers",
                title="Content Security Policy Is Too Permissive",
                description=f"CSP is present, but the scanner observed policy gaps: {', '.join(csp['issues']) or 'broad-source'}",
                impact="A permissive CSP gives browsers less protection against injected scripts.",
                recommendation="Prefer default-src 'self', lock object-src to 'none', set base-uri, and remove unsafe-inline/unsafe-eval or broad sources where possible.",
                status="warning",
                confidence="observed",
                source="headers",
                evidence=evidence,
                analysis="The header is present, but directive-level parsing found CSP hardening gaps in the final HTTP response.",
                verification=_header_verification(header),
                classification="observed-risk",
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
                analysis="The header is present, but the observed value is not DENY or SAMEORIGIN.",
                verification=_header_verification(header),
                classification="observed-risk",
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
                analysis="The header is present, but the observed value is not nosniff.",
                verification=_header_verification(header),
                classification="observed-risk",
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
                analysis="The header is present, but the observed value may send full URLs to other origins.",
                verification=_header_verification(header),
                classification="observed-risk",
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
        evidence=_missing_header_evidence(rule["header"]),
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
            evidence = _missing_header_evidence(rule["header"])
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
                evidence=evidence,
                analysis=(
                    f"{rule['header']} was not present in the final HTTP response headers captured by the scanner. "
                    "The absence is directly observed on this response, while the risk rating is a hardening recommendation "
                    "rather than proof of an exploitable vulnerability."
                ),
                verification=_header_verification(rule["header"]),
                classification="hardening-recommendation",
            ))

    return items, findings


def _response_evidence(response: httpx.Response) -> list[str]:
    headers = response.headers
    evidence = [
        f"status_code: {response.status_code}",
        f"final_url: {response.url}",
    ]

    for key in ("server", "x-powered-by", "content-type", "cache-control"):
        value = headers.get(key)
        if value:
            evidence.append(f"{key}: {_short(value)}")

    return evidence


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
        analysis="The Server header was present in the final HTTP response.",
        verification="Run curl -I against the final URL and inspect the Server response header.",
        classification="informational",
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
        responseEvidence=_response_evidence(response),
    )

    return AnalyzerResult(key="headers", status="success", data=result, findings=findings)
