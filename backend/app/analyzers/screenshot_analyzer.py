from app.schemas.report import ScreenshotResult
from app.schemas.analyzer import AnalyzerResult


async def analyze_screenshot(normalized_url: str, enabled: bool) -> AnalyzerResult:
    # Disabled by default — Playwright setup is optional in MVP
    if not enabled:
        result = ScreenshotResult(error="Screenshot capture is disabled (ENABLE_SCREENSHOT=false).")
        return AnalyzerResult(key="screenshot", status="success", data=result, findings=[])

    # TODO: implement with Playwright Python
    result = ScreenshotResult(error="Screenshot not yet implemented.")
    return AnalyzerResult(key="screenshot", status="success", data=result, findings=[])
