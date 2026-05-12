import asyncio
import base64
import time
from datetime import datetime, timezone

from app.schemas.report import ScreenshotResult
from app.schemas.analyzer import AnalyzerResult

_VIEWPORT = {"width": 1280, "height": 720}
_TIMEOUT_MS = 15_000


def _capture_sync(url: str) -> ScreenshotResult:
    """
    Uses Playwright's synchronous API (greenlet-based) so it works inside
    asyncio.to_thread without conflicting with uvicorn's event loop on Windows.
    """
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            context = browser.new_context(
                viewport=_VIEWPORT,
                ignore_https_errors=True,
                java_script_enabled=True,
            )
            page = context.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=_TIMEOUT_MS)
            time.sleep(1)

            png_bytes = page.screenshot(full_page=False, type="png")
            b64 = base64.b64encode(png_bytes).decode("utf-8")

            return ScreenshotResult(
                url=url,
                base64=b64,
                capturedAt=datetime.now(timezone.utc).isoformat(),
                viewport=f"{_VIEWPORT['width']}x{_VIEWPORT['height']}",
            )
        except PWTimeout:
            return ScreenshotResult(error=f"Page load timed out after {_TIMEOUT_MS // 1000}s.")
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
