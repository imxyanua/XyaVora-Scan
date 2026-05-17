import time
from urllib.parse import urljoin

import httpx

from app.core.config import settings
from app.schemas.analyzer import AnalyzerResult
from app.schemas.report import HttpOverviewResult
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


async def analyze_http_overview(normalized_url: str) -> AnalyzerResult:
    start = time.perf_counter()
    current_url = validate_public_http_url(normalized_url)
    chain = [current_url]
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
                        current_url = validate_public_http_url(urljoin(str(response.url), location))
                        chain.append(current_url)
                        continue

                    total = 0
                    async for chunk in response.aiter_bytes(chunk_size=8192):
                        total += len(chunk)
                        if total >= _MAX_RESPONSE_BYTES:
                            break

                    elapsed_ms = int((time.perf_counter() - start) * 1000)
                    headers = response.headers
                    result = HttpOverviewResult(
                        statusCode=response.status_code,
                        finalUrl=str(response.url),
                        redirectChain=chain,
                        redirectCount=max(len(chain) - 1, 0),
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
