import time
from urllib.parse import urljoin, urlparse

import httpx

from app.core.config import settings
from app.schemas.analyzer import AnalyzerResult
from app.schemas.report import Finding, HttpOverviewResult, RedirectHop
from app.utils.safe_fetch import validate_public_http_url

_USER_AGENT = "XyaVora-Scan/0.1 (passive-security-scanner; http-overview)"
_MAX_RESPONSE_BYTES = 512_000
_REDIRECT_STATUSES = {301, 302, 303, 307, 308}


def _content_length(headers: httpx.Headers) -> int | None:
    raw = headers.get("content-length")
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def _content_family(content_type: str | None) -> str | None:
    if not content_type:
        return None
    media_type = content_type.split(";", 1)[0].strip().lower()
    if media_type in {"text/html", "application/xhtml+xml"}:
        return "html"
    if media_type.endswith("+json") or media_type == "application/json":
        return "json"
    if media_type.startswith("text/"):
        return "text"
    if media_type.startswith("image/"):
        return "image"
    if media_type.startswith("font/"):
        return "font"
    if media_type in {"application/javascript", "application/ecmascript"}:
        return "script"
    return "other"


def _cache_policy(headers: httpx.Headers) -> str:
    cache_control = (headers.get("cache-control") or "").lower()
    if "no-store" in cache_control:
        return "no-store"
    if "no-cache" in cache_control:
        return "revalidate"
    if "private" in cache_control:
        return "private"
    if "public" in cache_control or "max-age" in cache_control or "s-maxage" in cache_control:
        return "cacheable"
    if headers.get("etag") or headers.get("last-modified") or headers.get("expires"):
        return "validator-present"
    return "not-specified"


def _canonical_redirect_type(initial_host: str | None, final_host: str | None) -> str | None:
    if not initial_host or not final_host or initial_host == final_host:
        return "none"

    initial = initial_host.lower()
    final = final_host.lower()
    if initial == f"www.{final}":
        return "www-to-apex"
    if final == f"www.{initial}":
        return "apex-to-www"
    if initial.removeprefix("www.") == final.removeprefix("www."):
        return "www-apex-normalization"
    return "cross-host"


def _redirect_summary(
    redirect_count: int,
    host_changed: bool,
    upgraded_to_https: bool,
    downgraded_from_https: bool,
    canonical_type: str | None,
) -> str:
    if redirect_count == 0:
        return "No redirects detected."
    notes = [f"{redirect_count} redirect hop(s)"]
    if upgraded_to_https:
        notes.append("upgraded to HTTPS")
    if downgraded_from_https:
        notes.append("downgraded from HTTPS")
    if host_changed and canonical_type and canonical_type != "none":
        notes.append(canonical_type)
    return ", ".join(notes) + "."


def _detect_cdn(headers: httpx.Headers) -> tuple[str | None, str | None, list[str]]:
    evidence: list[str] = []
    server = (headers.get("server") or "").lower()
    via = (headers.get("via") or "").lower()

    def _peek(name: str) -> str | None:
        return headers.get(name)

    def _header(name: str) -> str | None:
        value = headers.get(name)
        if value:
            evidence.append(f"{name}: {_short(value)}")
        return value

    cf_ray = _header("cf-ray")
    cf_cache = _header("cf-cache-status")
    if cf_ray or cf_cache:
        return "Cloudflare", "high", evidence
    if "cloudflare" in server:
        evidence.append(f"server: {_short(headers.get('server', ''))}")
        return "Cloudflare", "medium", evidence

    if _header("x-amz-cf-id"):
        return "AWS CloudFront", "high", evidence
    if "cloudfront" in via:
        evidence.append(f"via: {_short(headers.get('via', ''))}")
        return "AWS CloudFront", "medium", evidence

    if _header("x-fastly-request-id") or _header("fastly-debug-digest"):
        return "Fastly", "high", evidence
    x_served_by = (_peek("x-served-by") or "").lower()
    x_cache_hits = _peek("x-cache-hits")
    if "fastly" in via or "fastly" in server:
        if via:
            evidence.append(f"via: {_short(headers.get('via', ''))}")
        elif server:
            evidence.append(f"server: {_short(headers.get('server', ''))}")
        return "Fastly", "medium", evidence
    if x_served_by and ("fastly" in x_served_by or "cache-" in x_served_by):
        evidence.append(f"x-served-by: {_short(headers.get('x-served-by', ''))}")
        if x_cache_hits:
            evidence.append(f"x-cache-hits: {_short(x_cache_hits)}")
        return "Fastly", "medium", evidence

    if _header("x-akamai-transformed") or _header("akamai-cache-status"):
        return "Akamai", "high", evidence
    if "akamai" in server:
        evidence.append(f"server: {_short(headers.get('server', ''))}")
        return "Akamai", "medium", evidence

    if _header("x-vercel-id") or _header("x-vercel-cache"):
        return "Vercel", "high", evidence
    if "vercel" in server:
        evidence.append(f"server: {_short(headers.get('server', ''))}")
        return "Vercel", "medium", evidence

    if _header("x-nf-request-id"):
        return "Netlify", "high", evidence
    if _header("x-sucuri-id"):
        return "Sucuri", "high", evidence
    if _header("x-qc-cache"):
        return "QUIC.cloud", "high", evidence
    if _header("cdn-requestid"):
        return "BunnyCDN", "medium", evidence

    return None, None, []


def _short(value: str, limit: int = 96) -> str:
    value = " ".join(value.split())
    return value if len(value) <= limit else f"{value[:limit - 3]}..."


def _response_evidence(
    response: httpx.Response,
    total_bytes: int,
    elapsed_ms: int,
    redirect_count: int,
) -> list[str]:
    headers = response.headers
    evidence = [
        f"status_code: {response.status_code}",
        f"final_url: {response.url}",
        f"redirect_count: {redirect_count}",
        f"response_time_ms: {elapsed_ms}",
        f"bytes_read: {total_bytes}",
        f"content_family: {_content_family(headers.get('content-type')) or 'unknown'}",
        f"cache_policy: {_cache_policy(headers)}",
    ]

    for key in ("content-type", "content-length", "content-encoding", "cache-control", "etag", "last-modified"):
        value = headers.get(key)
        if value:
            evidence.append(f"{key}: {_short(value)}")

    return evidence


def _http_verification(final_url: str | None = None) -> str:
    target = final_url or "<final-url>"
    return f"Run curl -I -L {target} and compare the final status, redirect chain, and response headers."


def _build_findings(result: HttpOverviewResult) -> list[Finding]:
    findings: list[Finding] = []

    if result.statusCode >= 500:
        findings.append(Finding(
            id="http_server_error",
            severity="medium",
            category="HTTP",
            title="Server Returned 5xx Status",
            description=f"The final HTTP response returned status {result.statusCode}.",
            impact="The page may be unavailable or unstable for users and downstream scanners.",
            recommendation="Check server logs and upstream health for the scanned URL.",
            status="warning",
            confidence="observed",
            source="http",
            evidence=result.responseEvidence,
            analysis="The scanner followed the redirect chain and observed a final HTTP status in the 5xx range.",
            verification=_http_verification(result.finalUrl),
            classification="observed-risk",
        ))
    elif result.statusCode >= 400:
        findings.append(Finding(
            id="http_client_error",
            severity="low",
            category="HTTP",
            title="Final URL Returned 4xx Status",
            description=f"The final HTTP response returned status {result.statusCode}.",
            impact="The scanner reached a page that may be missing, blocked, or require access.",
            recommendation="Verify the scanned URL and whether access controls or bot protections are expected.",
            status="info",
            confidence="observed",
            source="http",
            evidence=result.responseEvidence,
            analysis=(
                "The scanner followed the redirect chain and observed a final HTTP status in the 4xx range. "
                "This may be expected for protected or bot-filtered URLs, so verify manually before treating it as a broken page."
            ),
            verification=_http_verification(result.finalUrl),
            classification="investigation-lead",
        ))

    if result.hostChanged:
        findings.append(Finding(
            id="http_host_changed",
            severity="info",
            category="HTTP",
            title="Request Redirected To A Different Host",
            description=f"The scan started at {result.initialHost} and ended at {result.finalHost}.",
            impact="This is often expected for www/apex redirects, but it changes which host the final page represents.",
            recommendation="Review the redirect chain if the final host is not expected.",
            status="info",
            confidence="observed",
            source="http",
            evidence=[
                *[f"{hop.statusCode}: {hop.fromUrl} -> {hop.toUrl}" for hop in result.redirectHops],
                *result.responseEvidence,
            ],
            analysis="The final response host differs from the original input host after redirects.",
            verification=_http_verification(result.finalUrl),
            classification="informational",
        ))

    if result.downgradedFromHttps:
        findings.append(Finding(
            id="http_https_downgrade",
            severity="high",
            category="HTTP",
            title="Redirect Downgraded HTTPS To HTTP",
            description="The redirect chain moved from HTTPS to HTTP.",
            impact="Users may lose transport encryption after following redirects.",
            recommendation="Keep the final URL on HTTPS and update redirect rules to avoid HTTPS-to-HTTP downgrades.",
            status="fail",
            confidence="observed",
            source="http",
            evidence=[
                *[f"{hop.statusCode}: {hop.fromUrl} -> {hop.toUrl}" for hop in result.redirectHops],
                *result.responseEvidence,
            ],
            analysis="The scanner observed a protocol transition from HTTPS to HTTP in the redirect chain.",
            verification=_http_verification(result.finalUrl),
            classification="observed-risk",
        ))

    if result.redirectCount >= 4:
        findings.append(Finding(
            id="http_redirect_chain_long",
            severity="low",
            category="HTTP",
            title="Redirect Chain Is Long",
            description=f"The request followed {result.redirectCount} redirect hops before reaching the final URL.",
            impact="Long redirect chains add latency and can make canonical behavior harder to reason about.",
            recommendation="Collapse redirects so users and crawlers reach the canonical URL in one or two hops.",
            status="warning",
            confidence="observed",
            source="http",
            evidence=[f"{hop.statusCode}: {hop.fromUrl} -> {hop.toUrl}" for hop in result.redirectHops],
            analysis="The scanner observed four or more redirect hops before the final response.",
            verification=_http_verification(result.finalUrl),
            classification="observed-risk",
        ))

    return findings


async def analyze_http_overview(normalized_url: str) -> AnalyzerResult:
    start = time.perf_counter()
    current_url = validate_public_http_url(normalized_url)
    chain = [current_url]
    hops: list[RedirectHop] = []
    initial_host = urlparse(current_url).hostname
    initial_protocol = urlparse(current_url).scheme
    timeout = httpx.Timeout(settings.FETCH_TIMEOUT_SECONDS)

    try:
        async with httpx.AsyncClient(
            follow_redirects=False,
            timeout=timeout,
            headers={"User-Agent": _USER_AGENT},
        ) as client:
            for _ in range(5 + 1):
                async with client.stream("GET", current_url) as response:
                    location = response.headers.get("location")
                    if response.status_code in _REDIRECT_STATUSES and location:
                        next_url = validate_public_http_url(urljoin(str(response.url), location))
                        from_parts = urlparse(str(response.url))
                        to_parts = urlparse(next_url)
                        hops.append(RedirectHop(
                            fromUrl=str(response.url),
                            toUrl=next_url,
                            statusCode=response.status_code,
                            fromHost=from_parts.hostname,
                            toHost=to_parts.hostname,
                            fromProtocol=from_parts.scheme,
                            toProtocol=to_parts.scheme,
                            hostChanged=bool(from_parts.hostname and to_parts.hostname and from_parts.hostname != to_parts.hostname),
                            protocolChanged=bool(from_parts.scheme and to_parts.scheme and from_parts.scheme != to_parts.scheme),
                        ))
                        current_url = next_url
                        chain.append(current_url)
                        continue

                    total = 0
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        total += len(chunk)
                        if total >= _MAX_RESPONSE_BYTES:
                            break

                    elapsed_ms = int((time.perf_counter() - start) * 1000)
                    headers = response.headers
                    cdn_provider, cdn_confidence, cdn_evidence = _detect_cdn(headers)
                    final_url = str(response.url)
                    parsed_final = urlparse(final_url)
                    redirect_count = max(len(chain) - 1, 0)
                    host_changed = bool(initial_host and parsed_final.hostname and initial_host != parsed_final.hostname)
                    protocols = [
                        *(hop.fromProtocol for hop in hops if hop.fromProtocol),
                        *(hop.toProtocol for hop in hops if hop.toProtocol),
                    ] or [initial_protocol, parsed_final.scheme]
                    upgraded_to_https = "http" in protocols and parsed_final.scheme == "https"
                    downgraded_from_https = any(
                        hop.fromProtocol == "https" and hop.toProtocol == "http"
                        for hop in hops
                    ) or (initial_protocol == "https" and parsed_final.scheme == "http")
                    canonical_type = _canonical_redirect_type(initial_host, parsed_final.hostname)
                    result = HttpOverviewResult(
                        statusCode=response.status_code,
                        finalUrl=final_url,
                        redirectChain=chain,
                        redirectHops=hops,
                        redirectCount=redirect_count,
                        initialHost=initial_host,
                        finalHost=parsed_final.hostname,
                        initialProtocol=initial_protocol,
                        finalProtocol=parsed_final.scheme,
                        hostChanged=host_changed,
                        crossHostRedirect=any(hop.hostChanged for hop in hops) or host_changed,
                        upgradedToHttps=upgraded_to_https,
                        downgradedFromHttps=downgraded_from_https,
                        canonicalRedirectType=canonical_type,
                        redirectSummary=_redirect_summary(
                            redirect_count,
                            host_changed,
                            upgraded_to_https,
                            downgraded_from_https,
                            canonical_type,
                        ),
                        server=headers.get("server"),
                        poweredBy=headers.get("x-powered-by"),
                        via=headers.get("via"),
                        cdnProvider=cdn_provider,
                        cdnConfidence=cdn_confidence,  # type: ignore[arg-type]
                        cdnEvidence=cdn_evidence,
                        altSvc=headers.get("alt-svc"),
                        contentType=headers.get("content-type"),
                        contentFamily=_content_family(headers.get("content-type")),
                        contentLength=_content_length(headers),
                        responseBytes=total,
                        responseTruncated=total >= _MAX_RESPONSE_BYTES,
                        responseTimeMs=elapsed_ms,
                        compression=headers.get("content-encoding"),
                        cacheControl=headers.get("cache-control"),
                        cachePolicy=_cache_policy(headers),
                        expires=headers.get("expires"),
                        etag=headers.get("etag"),
                        lastModified=headers.get("last-modified"),
                        responseEvidence=_response_evidence(response, total, elapsed_ms, redirect_count),
                    )
                    return AnalyzerResult(key="httpOverview", status="success", data=result, findings=_build_findings(result))
            raise httpx.TooManyRedirects(f"Exceeded redirect limit for {normalized_url}")
    except httpx.TimeoutException:
        return AnalyzerResult(
            key="httpOverview",
            status="error",
            data=HttpOverviewResult(error="Request timed out"),
            findings=[],
            errors=["Request timed out"],
        )
    except Exception as exc:
        return AnalyzerResult(
            key="httpOverview",
            status="error",
            data=HttpOverviewResult(error=str(exc)),
            findings=[],
            errors=[str(exc)],
        )
