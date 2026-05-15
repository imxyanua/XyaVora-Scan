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
_MIN_NAVIGATION_TIMEOUT_MS = 5_000
_MAX_NAVIGATION_TIMEOUT_MS = 10_000
_SCREENSHOT_FALLBACK_TIMEOUT_MS = 2_000
_DOM_READY_TIMEOUT_MS = 1_500
_NETWORK_IDLE_TIMEOUT_MS = 1_000
_IMAGE_READY_TIMEOUT_MS = 1_500
_RENDER_SETTLE_SECONDS = 0.4
_RESOURCE_TIMEOUT_SECONDS = 1
_DEFAULT_MAX_RESOURCE_BYTES = 1_000_000
_RESOURCE_BYTE_LIMITS = {
    "document": 1_500_000,
    "stylesheet": 750_000,
    "script": 650_000,
    "font": 500_000,
    "image": 2_500_000,
    "fetch": 500_000,
    "xhr": 500_000,
}
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
)
_BROWSER_HEADERS = {
    "Accept-Language": "en-US,en;q=0.9",
    "DNT": "1",
}
_REDIRECT_STATUSES = {301, 302, 303, 307, 308}
_ALLOWED_RESOURCE_TYPES = {"document", "stylesheet", "script", "font", "image", "fetch", "xhr"}
_BLOCKED_HOST_PARTS = (
    "google-analytics.com",
    "googletagmanager.com",
    "doubleclick.net",
    "facebook.net",
    "hotjar.com",
    "clarity.ms",
)


ResourceCache = dict[str, tuple[int, dict[str, str], bytes]]


def _navigation_timeout_ms() -> int:
    """Give each viewport a bounded slice of the configured screenshot budget."""
    budget_ms = max(settings.SCREENSHOT_TIMEOUT_SECONDS, 1) * 1000
    per_viewport_ms = budget_ms // 6
    return max(
        _MIN_NAVIGATION_TIMEOUT_MS,
        min(_MAX_NAVIGATION_TIMEOUT_MS, per_viewport_ms),
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


def _safe_resource_fetch(
    url: str,
    cache: ResourceCache | None = None,
    resource_type: str = "document",
) -> tuple[int, dict[str, str], bytes]:
    """Fetch a browser resource through Python so Chromium never accesses the network directly."""
    current_url = validate_public_http_url(url)
    if cache is not None and current_url in cache:
        return cache[current_url]

    timeout = httpx.Timeout(min(settings.FETCH_TIMEOUT_SECONDS, _RESOURCE_TIMEOUT_SECONDS))
    max_bytes = _RESOURCE_BYTE_LIMITS.get(resource_type, _DEFAULT_MAX_RESOURCE_BYTES)

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
                    if total >= max_bytes:
                        break

                headers = {
                    key: value
                    for key, value in response.headers.items()
                    if key.lower() not in {"content-encoding", "content-length", "transfer-encoding"}
                }
                result = (response.status_code, headers, b"".join(chunks))
                if cache is not None:
                    cache[current_url] = result
                    cache[url] = result
                return result

    raise httpx.TooManyRedirects(f"Exceeded redirect limit for {url}")


def _screenshot_page(page, timeout_ms: int) -> str:
    png = page.screenshot(
        full_page=False,
        type="png",
        timeout=min(_SCREENSHOT_FALLBACK_TIMEOUT_MS, timeout_ms),
        animations="disabled",
        caret="hide",
    )
    return base64.b64encode(png).decode("utf-8")


def _goto_for_capture(page, url: str, timeout_ms: int, timeout_error_type: type[Exception]) -> None:
    try:
        page.goto(url, wait_until="commit", timeout=timeout_ms)
    except timeout_error_type:
        raise
    except Exception as exc:
        message = str(exc).lower()
        if "commit" not in message or "wait_until" not in message:
            raise
        page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)


def _settle_page_for_capture(page, timeout_ms: int, timeout_error_type: type[Exception]) -> None:
    """Best-effort wait for meaningful first-viewport rendering without blocking the whole scan."""
    for state, limit_ms in (
        ("domcontentloaded", _DOM_READY_TIMEOUT_MS),
        ("networkidle", _NETWORK_IDLE_TIMEOUT_MS),
    ):
        try:
            page.wait_for_load_state(state, timeout=min(limit_ms, timeout_ms))
        except timeout_error_type:
            pass

    try:
        page.wait_for_function(
            """
            () => Array.from(document.images)
              .filter((img) => {
                const rect = img.getBoundingClientRect();
                return rect.width > 24 && rect.height > 24
                  && rect.bottom >= 0 && rect.right >= 0
                  && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
              })
              .every((img) => img.complete)
            """,
            timeout=min(_IMAGE_READY_TIMEOUT_MS, timeout_ms),
        )
    except timeout_error_type:
        pass

    time.sleep(_RENDER_SETTLE_SECONDS)


def _capture_one(
    browser,
    url: str,
    viewport: dict,
    resource_cache: ResourceCache | None = None,
) -> tuple[str | None, str | None]:
    """Returns (base64_png, error_str). Closes its own context."""
    from playwright.sync_api import TimeoutError as PWTimeout

    timeout_ms = _navigation_timeout_ms()

    try:
        validate_public_http_url(url)
        ctx = browser.new_context(
            viewport=viewport,
            ignore_https_errors=True,
            java_script_enabled=True,
            user_agent=_USER_AGENT,
            extra_http_headers=_BROWSER_HEADERS,
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
                status, headers, body = _safe_resource_fetch(
                    req_url,
                    resource_cache,
                    request.resource_type,
                )
            except Exception:
                route.abort()
                return

            route.fulfill(status=status, headers=headers, body=body)

        page.route("**/*", _route_guard)
        try:
            _goto_for_capture(page, url, timeout_ms, PWTimeout)
            _settle_page_for_capture(page, timeout_ms, PWTimeout)
            return _screenshot_page(page, timeout_ms), None
        except PWTimeout:
            try:
                return (
                    _screenshot_page(page, timeout_ms),
                    f"Page load exceeded {timeout_ms // 1000}s; captured partial render.",
                )
            except Exception:
                return None, f"Page load timed out after {timeout_ms // 1000}s."
        finally:
            ctx.close()
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
                resource_cache: ResourceCache = {}
                desktop_b64, desktop_err = _capture_one(browser, url, _DESKTOP_VP, resource_cache)
                mobile_b64,  mobile_err  = _capture_one(browser, url, _MOBILE_VP, resource_cache)

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
