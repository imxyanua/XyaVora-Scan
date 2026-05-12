import httpx
from app.core.config import settings

# Sent with every request so target servers can identify the scanner.
_USER_AGENT = "XyaVora-Scan/0.1 (passive-security-scanner; not a browser)"


async def fetch_headers_only(url: str) -> httpx.Response:
    """
    Streams a GET request and returns immediately after headers arrive,
    without reading the response body. Used by analyzers that only need
    headers (headers_analyzer, cookies_analyzer, security_txt_analyzer).

    We use GET instead of HEAD because some servers omit security headers
    on HEAD requests or return different status codes.
    """
    timeout = httpx.Timeout(settings.FETCH_TIMEOUT_SECONDS)
    async with httpx.AsyncClient(
        follow_redirects=True,
        max_redirects=5,
        timeout=timeout,
        headers={"User-Agent": _USER_AGENT},
    ) as client:
        async with client.stream("GET", url) as response:
            # Trigger header receipt without consuming the body
            return response


async def fetch_html(url: str) -> tuple[httpx.Response, bytes]:
    """
    Downloads up to MAX_HTML_BYTES of the response body.
    Used by tech_stack_analyzer which needs to inspect HTML content.
    """
    timeout = httpx.Timeout(settings.FETCH_TIMEOUT_SECONDS)
    async with httpx.AsyncClient(
        follow_redirects=True,
        max_redirects=5,
        timeout=timeout,
        headers={"User-Agent": _USER_AGENT},
    ) as client:
        async with client.stream("GET", url) as response:
            chunks: list[bytes] = []
            total = 0
            async for chunk in response.aiter_bytes(chunk_size=8192):
                chunks.append(chunk)
                total += len(chunk)
                if total >= settings.MAX_HTML_BYTES:
                    break
            body = b"".join(chunks)
        return response, body
