import asyncio
import base64
import time
from datetime import datetime, timezone

from app.schemas.report import ScreenshotResult
from app.schemas.analyzer import AnalyzerResult

_DESKTOP_VP = {"width": 1280, "height": 720}
_MOBILE_VP  = {"width": 390,  "height": 844}
_TIMEOUT_MS = 15_000


def _capture_one(browser, url: str, viewport: dict) -> tuple[str | None, str | None]:
    """Returns (base64_png, error_str). Closes its own context."""
    from playwright.sync_api import TimeoutError as PWTimeout
    try:
        ctx = browser.new_context(
            viewport=viewport,
            ignore_https_errors=True,
            java_script_enabled=True,
        )
        page = ctx.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=_TIMEOUT_MS)
        time.sleep(0.8)
        png = page.screenshot(full_page=False, type="png")
        ctx.close()
        return base64.b64encode(png).decode("utf-8"), None
    except PWTimeout:
        return None, f"Page load timed out after {_TIMEOUT_MS // 1000}s."
    except Exception as exc:
        return None, str(exc)


def _capture_sync(url: str) -> ScreenshotResult:
    """
    Uses Playwright's synchronous API (greenlet-based) so it works inside
    asyncio.to_thread without conflicting with uvicorn's event loop on Windows.
    Captures desktop (1280x720) and mobile (390x844) in one browser session.
    """
    from playwright.sync_api import sync_playwright

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
        except Exception as exc:
            return ScreenshotResult(error=str(exc))
        finally:
            browser.close()


async def analyze_screenshot(normalized_url: str, enabled: bool) -> AnalyzerResult:
    if not enabled:
        result = ScreenshotResult(
            error="Screenshot capture is disabled (ENABLE_SCREENSHOT=false)."
        )
        return AnalyzerResult(key="screenshot", status="success", data=result, findings=[])

    result = await asyncio.to_thread(_capture_sync, normalized_url)
    return AnalyzerResult(key="screenshot", status="success", data=result, findings=[])
