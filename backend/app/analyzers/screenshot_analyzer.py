import asyncio
import base64
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urljoin

import httpx

from app.core.config import settings
from app.schemas.report import ScreenshotResult
from app.schemas.analyzer import AnalyzerResult
from app.utils.safe_fetch import validate_public_http_url

_DESKTOP_VP = {"width": 1280, "height": 720}
_MOBILE_VP  = {"width": 390,  "height": 844}
_TIMEOUT_MS = 8_000
_RESOURCE_TIMEOUT_SECONDS = 2
_MAX_RESOURCE_BYTES = 750_000
_USER_AGENT = "XyaVora-Scan/0.1 (passive-security-scanner; screenshot-renderer)"
_REDIRECT_STATUSES = {301, 302, 303, 307, 308}
_ALLOWED_RESOURCE_TYPES = {"document", "stylesheet", "image"}
_BLOCKED_HOST_PARTS = (
    "google-analytics.com",
    "googletagmanager.com",
    "doubleclick.net",
    "facebook.net",
    "hotjar.com",
    "clarity.ms",
)


def _ensure_windows_subprocess_loop() -> None:
    """
    Playwright starts a browser subprocess. Some Windows event-loop policies
    do not support subprocess transports, so force Proactor before Playwright
    creates a loop.
    """
    if sys.platform != "win32":
        return

    policy_factory = getattr(asyncio, "WindowsProactorEventLoopPolicy", None)
    if policy_factory is None:
        return

    current_policy = asyncio.get_event_loop_policy()
    if current_policy.__class__.__name__ != "WindowsProactorEventLoopPolicy":
        asyncio.set_event_loop_policy(policy_factory())


def _safe_resource_fetch(url: str) -> tuple[int, dict[str, str], bytes]:
    """Fetch a browser resource through Python so Chromium never accesses the network directly."""
    current_url = validate_public_http_url(url)
    timeout = httpx.Timeout(min(settings.FETCH_TIMEOUT_SECONDS, _RESOURCE_TIMEOUT_SECONDS))

    with httpx.Client(
        follow_redirects=False,
        timeout=timeout,
        headers={"User-Agent": _USER_AGENT},
    ) as client:
        for _ in range(5 + 1):
            with client.stream("GET", current_url) as response:
                location = response.headers.get("location")
                if response.status_code in _REDIRECT_STATUSES and location:
                    current_url = validate_public_http_url(urljoin(str(response.url), location))
                    continue

                chunks: list[bytes] = []
                total = 0
                for chunk in response.iter_bytes(chunk_size=8192):
                    chunks.append(chunk)
                    total += len(chunk)
                    if total >= _MAX_RESOURCE_BYTES:
                        break

                headers = {
                    key: value
                    for key, value in response.headers.items()
                    if key.lower() not in {"content-encoding", "content-length", "transfer-encoding"}
                }
                return response.status_code, headers, b"".join(chunks)

    raise httpx.TooManyRedirects(f"Exceeded redirect limit for {url}")


def _capture_one(browser, url: str, viewport: dict) -> tuple[str | None, str | None]:
    """Returns (base64_png, error_str). Closes its own context."""
    from playwright.sync_api import TimeoutError as PWTimeout
    try:
        validate_public_http_url(url)
        ctx = browser.new_context(
            viewport=viewport,
            ignore_https_errors=True,
            java_script_enabled=True,
        )
        page = ctx.new_page()

        def _route_guard(route, request):
            req_url = request.url
            if not req_url.startswith(("http://", "https://")):
                route.continue_()
                return
            if request.resource_type not in _ALLOWED_RESOURCE_TYPES:
                route.abort()
                return
            if any(host_part in req_url for host_part in _BLOCKED_HOST_PARTS):
                route.abort()
                return
            if request.method not in ("GET", "HEAD"):
                route.abort()
                return

            try:
                status, headers, body = _safe_resource_fetch(req_url)
            except Exception:
                route.abort()
                return

            route.fulfill(status=status, headers=headers, body=body)

        page.route("**/*", _route_guard)
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=_TIMEOUT_MS)
            time.sleep(0.1)
            png = page.screenshot(full_page=False, type="png")
            return base64.b64encode(png).decode("utf-8"), None
        finally:
            ctx.close()
    except PWTimeout:
        return None, f"Page load timed out after {_TIMEOUT_MS // 1000}s."
    except Exception as exc:
        return None, str(exc)


def _capture_sync(url: str) -> ScreenshotResult:
    """
    Uses Playwright's synchronous API (greenlet-based) so it works inside
    asyncio.to_thread without conflicting with the active event loop on Windows.
    Captures desktop (1280x720) and mobile (390x844) in one browser session.
    """
    from playwright.sync_api import sync_playwright

    try:
        _ensure_windows_subprocess_loop()
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                desktop_b64, desktop_err = _capture_one(browser, url, _DESKTOP_VP)
                mobile_b64,  mobile_err  = _capture_one(browser, url, _MOBILE_VP)

                return ScreenshotResult(
                    url=url,
                    base64=desktop_b64,
                    mobileBase64=mobile_b64,
                    capturedAt=datetime.now(timezone.utc).isoformat(),
                    viewport=f"{_DESKTOP_VP['width']}x{_DESKTOP_VP['height']}",
                    mobileViewport=f"{_MOBILE_VP['width']}x{_MOBILE_VP['height']}",
                    error=desktop_err or mobile_err or None,
                )
            finally:
                browser.close()
    except NotImplementedError:
        return ScreenshotResult(
            url=url,
            error=(
                "Screenshot capture is unavailable in this Windows event loop. "
                "Install Playwright browsers in the backend runtime and restart the service."
            ),
        )
    except Exception as exc:
        return ScreenshotResult(url=url, error=str(exc))


async def analyze_screenshot(normalized_url: str, enabled: bool) -> AnalyzerResult:
    if not enabled:
        result = ScreenshotResult(
            error="Screenshot capture is disabled (ENABLE_SCREENSHOT=false)."
        )
        return AnalyzerResult(key="screenshot", status="success", data=result, findings=[])

    try:
        result = await asyncio.to_thread(_capture_sync, normalized_url)
    except Exception as exc:
        result = ScreenshotResult(url=normalized_url, error=str(exc))
    return AnalyzerResult(key="screenshot", status="success", data=result, findings=[])
