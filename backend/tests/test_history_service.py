import json

from app.schemas.report import ScanReport, ScreenshotResult
from app.services import history_service


def _report() -> ScanReport:
    return ScanReport(
        target="example.com",
        normalizedUrl="https://example.com",
        hostname="example.com",
        scanTime="2026-05-15T00:00:00+00:00",
        score=100,
        grade="A",
        status="Low Risk",
        summary="ok",
        screenshot=ScreenshotResult(
            url="https://example.com",
            base64="desktop-image",
            mobileBase64="mobile-image",
            viewport="1280x720",
            mobileViewport="390x844",
        ),
        findings=[],
    )


def test_append_strips_screenshot_images(tmp_path, monkeypatch):
    history_file = tmp_path / "history.json"
    monkeypatch.setattr(history_service, "_HISTORY_FILE", history_file)

    history_service.append(_report())

    entries = json.loads(history_file.read_text(encoding="utf-8"))
    screenshot = entries[0]["report"]["screenshot"]
    assert screenshot["base64"] is None
    assert screenshot["mobileBase64"] is None
    assert screenshot["url"] == "https://example.com"
    assert screenshot["viewport"] == "1280x720"
