"""Tests for screenshot_analyzer; mocks Playwright so no browser is needed."""
import asyncio
import sys
from unittest.mock import MagicMock, patch

import pytest

# Playwright may not be installed in CI; stub it out before importing the module.
_pw_stub = MagicMock()
_pw_stub.sync_api.TimeoutError = type("TimeoutError", (Exception,), {})
sys.modules.setdefault("playwright", _pw_stub)
sys.modules.setdefault("playwright.sync_api", _pw_stub.sync_api)

from app.analyzers.screenshot_analyzer import (  # noqa: E402
    _ALLOWED_RESOURCE_TYPES,
    _BROWSER_HEADERS,
    _USER_AGENT,
    analyze_screenshot,
    _capture_one,
)


def _make_browser(png_bytes: bytes = b"PNG"):
    """Return a fake Playwright browser that yields png_bytes on screenshot()."""
    page = MagicMock()
    page.goto.return_value = None
    page.screenshot.return_value = png_bytes
    ctx = MagicMock()
    ctx.new_page.return_value = page
    browser = MagicMock()
    browser.new_context.return_value = ctx
    return browser, page, ctx


def test_capture_one_returns_base64():
    import base64
    png = b"\x89PNG\r\n"
    browser, page, _ = _make_browser(png)
    with patch("app.analyzers.screenshot_analyzer.time") as mock_time:
        mock_time.sleep.return_value = None
        b64, err = _capture_one(browser, "https://example.com", {"width": 1280, "height": 720})
    assert err is None
    assert b64 == base64.b64encode(png).decode()
    page.goto.assert_called_once()
    assert page.goto.call_args.kwargs["wait_until"] == "commit"
    assert page.goto.call_args.kwargs["timeout"] >= 5000
    browser.new_context.assert_called_once()
    assert browser.new_context.call_args.kwargs["user_agent"] == _USER_AGENT
    assert browser.new_context.call_args.kwargs["extra_http_headers"] == _BROWSER_HEADERS


def test_capture_allows_spa_rendering_resources():
    assert {"script", "font", "fetch", "xhr"}.issubset(_ALLOWED_RESOURCE_TYPES)


def test_capture_one_timeout_returns_error():
    PWTimeout = sys.modules["playwright.sync_api"].TimeoutError
    browser = MagicMock()
    ctx = MagicMock()
    page = MagicMock()
    page.goto.side_effect = PWTimeout("timeout")
    page.screenshot.side_effect = RuntimeError("no frame")
    ctx.new_page.return_value = page
    browser.new_context.return_value = ctx

    b64, err = _capture_one(browser, "https://example.com", {"width": 390, "height": 844})
    assert b64 is None
    assert "timed out" in err.lower()


def test_capture_one_timeout_returns_partial_screenshot():
    import base64
    PWTimeout = sys.modules["playwright.sync_api"].TimeoutError
    png = b"\x89PNG\r\npartial"
    browser, page, _ = _make_browser(png)
    page.goto.side_effect = PWTimeout("timeout")

    b64, err = _capture_one(browser, "https://example.com", {"width": 390, "height": 844})

    assert b64 == base64.b64encode(png).decode()
    assert err is not None
    assert "partial render" in err


def test_capture_one_falls_back_when_commit_wait_is_unsupported():
    png = b"\x89PNG\r\n"
    browser, page, _ = _make_browser(png)
    page.goto.side_effect = [RuntimeError("invalid wait_until value: commit"), None]

    with patch("app.analyzers.screenshot_analyzer.time") as mock_time:
        mock_time.sleep.return_value = None
        b64, err = _capture_one(browser, "https://example.com", {"width": 1280, "height": 720})

    assert b64 is not None
    assert err is None
    assert page.goto.call_count == 2
    assert page.goto.call_args_list[1].kwargs["wait_until"] == "domcontentloaded"


def test_capture_one_generic_exception_returns_error():
    browser = MagicMock()
    ctx = MagicMock()
    page = MagicMock()
    page.goto.side_effect = RuntimeError("connection refused")
    ctx.new_page.return_value = ctx
    browser.new_context.return_value = ctx

    b64, err = _capture_one(browser, "https://example.com", {"width": 1280, "height": 720})
    assert b64 is None
    assert err is not None


@pytest.mark.asyncio
async def test_disabled_returns_error_field():
    result = await analyze_screenshot("https://example.com", enabled=False)
    assert result.status == "success"
    assert result.data.error is not None
    assert "disabled" in result.data.error.lower()
    assert result.data.base64 is None


@pytest.mark.asyncio
async def test_disabled_returns_no_findings():
    result = await analyze_screenshot("https://example.com", enabled=False)
    assert result.findings == []


def _fake_capture_sync(url: str):
    from app.schemas.report import ScreenshotResult
    from datetime import datetime, timezone
    return ScreenshotResult(
        url=url,
        base64="AAAA",
        mobileBase64="BBBB",
        capturedAt=datetime.now(timezone.utc).isoformat(),
        viewport="1280x720",
        mobileViewport="390x844",
    )


@pytest.mark.asyncio
async def test_enabled_calls_capture_sync():
    async def fake_to_thread(fn, url):
        return _fake_capture_sync(url)

    with patch("app.analyzers.screenshot_analyzer.asyncio.to_thread", fake_to_thread):
        result = await analyze_screenshot("https://example.com", enabled=True)
    assert result.status == "success"
    assert result.data.base64 == "AAAA"
    assert result.data.mobileBase64 == "BBBB"
    assert result.data.error is None


@pytest.mark.asyncio
async def test_enabled_capture_error_propagates():
    from app.schemas.report import ScreenshotResult

    async def fake_to_thread(fn, url):
        return ScreenshotResult(error="Page load timed out after 15s.")

    with patch("app.analyzers.screenshot_analyzer.asyncio.to_thread", fake_to_thread):
        result = await analyze_screenshot("https://bad.example", enabled=True)
    assert result.status == "success"
    assert result.data.error is not None
    assert result.data.base64 is None
