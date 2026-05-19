import time
from urllib.parse import urljoin, urlparse

import httpx

from app.core.config import settings
from app.schemas.analyzer import AnalyzerResult
from app.schemas.report import HttpOverviewResult, RedirectHop
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


async def analyze_http_overview(normalized_url: str) -> AnalyzerResult:
    start = time.perf_counter()
    current_url = validate_public_http_url(normalized_url)
    chain = [current_url]
    hops: list[RedirectHop] = []
    initial_host = urlparse(current_url).hostname
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
                        hops.append(RedirectHop(
                            fromUrl=str(response.url),
                            toUrl=next_url,
                            statusCode=response.status_code,
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
                    result = HttpOverviewResult(
                        statusCode=response.status_code,
                        finalUrl=final_url,
                        redirectChain=chain,
                        redirectHops=hops,
                        redirectCount=max(len(chain) - 1, 0),
                        initialHost=initial_host,
                        finalHost=parsed_final.hostname,
                        finalProtocol=parsed_final.scheme,
                        hostChanged=bool(initial_host and parsed_final.hostname and initial_host != parsed_final.hostname),
                        server=headers.get("server"),
                        poweredBy=headers.get("x-powered-by"),
                        via=headers.get("via"),
                        cdnProvider=cdn_provider,
                        cdnConfidence=cdn_confidence,  # type: ignore[arg-type]
                        cdnEvidence=cdn_evidence,
                        altSvc=headers.get("alt-svc"),
                        contentType=headers.get("content-type"),
                        contentLength=_content_length(headers),
                        responseBytes=total,
                        responseTimeMs=elapsed_ms,
                        compression=headers.get("content-encoding"),
                        cacheControl=headers.get("cache-control"),
                        expires=headers.get("expires"),
                        etag=headers.get("etag"),
                        lastModified=headers.get("last-modified"),
                    )
                    return AnalyzerResult(key="httpOverview", status="success", data=result, findings=[])
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
