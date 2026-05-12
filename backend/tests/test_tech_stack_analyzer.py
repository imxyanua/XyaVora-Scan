import pytest
from unittest.mock import patch, AsyncMock, MagicMock

import httpx

from app.analyzers.tech_stack_analyzer import analyze_tech_stack, _detect


# ── Helpers ───────────────────────────────────────────────────────

def _response(headers: dict) -> MagicMock:
    """Fake httpx.Response with lowercase header dict."""
    r = MagicMock(spec=httpx.Response)
    r.headers = {k.lower(): v for k, v in headers.items()}
    return r


# ── Unit: _detect ─────────────────────────────────────────────────

def test_detect_nginx_from_server_header():
    items = _detect({"server": "nginx/1.25.0"}, b"")
    names = [i.name for i in items]
    assert "nginx" in names


def test_detect_cloudflare_from_cf_ray_header():
    items = _detect({"cf-ray": "abc123-LHR"}, b"")
    names = [i.name for i in items]
    assert "Cloudflare" in names


def test_detect_wordpress_from_html():
    html = b'<link rel="stylesheet" href="/wp-content/themes/main.css">'
    items = _detect({}, html)
    assert any(i.name == "WordPress" for i in items)


def test_detect_nextjs_from_html():
    html = b'<script id="__NEXT_DATA__" type="application/json">{}</script>'
    items = _detect({}, html)
    names = [i.name for i in items]
    assert "Next.js" in names


def test_detect_react_from_html():
    html = b'<div id="root" data-reactroot=""></div>'
    items = _detect({}, html)
    assert any(i.name == "React" for i in items)


def test_detect_jquery_version():
    html = b'<script src="/js/jquery-3.6.0.min.js"></script>'
    items = _detect({}, html)
    jq = next((i for i in items if i.name == "jQuery"), None)
    assert jq is not None
    assert jq.version == "3.6.0"


def test_detect_php_version():
    items = _detect({"x-powered-by": "PHP/8.2.1"}, b"")
    php = next((i for i in items if i.name == "PHP"), None)
    assert php is not None
    assert php.version == "8.2.1"


def test_detect_no_duplicates():
    # Next.js detected via both header and HTML — should appear only once
    headers = {"x-powered-by": "Next.js"}
    html = b'<script>window.__NEXT_DATA__ = {};</script>'
    items = _detect(headers, html)
    assert [i.name for i in items].count("Next.js") == 1


def test_detect_empty():
    items = _detect({}, b"<html><body>Hello</body></html>")
    assert isinstance(items, list)


# ── Integration: analyze_tech_stack with mock ─────────────────────

@pytest.mark.asyncio
async def test_analyze_tech_stack_success():
    fake_response = _response({"server": "nginx/1.25", "x-powered-by": "PHP/8.1"})
    html = b'<html><body><script src="/wp-content/plugins/x.js"></script></body></html>'

    with patch("app.analyzers.tech_stack_analyzer.fetch_html", return_value=(fake_response, html)):
        result = await analyze_tech_stack("https://example.com")

    assert result.status == "success"
    names = [i.name for i in result.data]
    assert "nginx" in names
    assert "PHP" in names
    assert "WordPress" in names


@pytest.mark.asyncio
async def test_analyze_tech_stack_timeout():
    with patch(
        "app.analyzers.tech_stack_analyzer.fetch_html",
        side_effect=httpx.TimeoutException("timed out"),
    ):
        result = await analyze_tech_stack("https://example.com")

    assert result.status == "error"
    assert result.errors


@pytest.mark.asyncio
async def test_analyze_tech_stack_request_error():
    with patch(
        "app.analyzers.tech_stack_analyzer.fetch_html",
        side_effect=httpx.RequestError("connection failed"),
    ):
        result = await analyze_tech_stack("https://example.com")

    assert result.status == "error"
