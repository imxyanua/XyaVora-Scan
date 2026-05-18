import pytest
from unittest.mock import patch, AsyncMock, MagicMock

import httpx

from app.analyzers.tech_stack_analyzer import analyze_tech_stack, _detect, _extract_asset_urls


# ── Helpers ───────────────────────────────────────────────────────

def _response(headers: dict) -> MagicMock:
    """Fake httpx.Response with lowercase header dict."""
    r = MagicMock(spec=httpx.Response)
    r.headers = {k.lower(): v for k, v in headers.items()}
    return r


# ── Unit: _detect ─────────────────────────────────────────────────

def test_detect_nginx_from_server_header():
    items = _detect({"server": "nginx/1.25.0"}, b"")
    nginx = next((i for i in items if i.name == "nginx"), None)
    assert nginx is not None
    assert "header" in nginx.sources
    assert any("header:server" in item for item in nginx.evidence)


def test_detect_cloudflare_from_cf_ray_header():
    items = _detect({"cf-ray": "abc123-LHR"}, b"")
    names = [i.name for i in items]
    assert "Cloudflare" in names


def test_detect_wordpress_from_html():
    html = b'<link rel="stylesheet" href="/wp-content/themes/main.css">'
    items = _detect({}, html)
    wp = next((i for i in items if i.name == "WordPress"), None)
    assert wp is not None
    assert "html" in wp.sources


def test_detect_nextjs_from_html():
    html = b'<script id="__NEXT_DATA__" type="application/json">{}</script>'
    items = _detect({}, html)
    names = [i.name for i in items]
    assert "Next.js" in names
    assert "React" in names


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


def test_detect_wordpress_version_from_meta_generator():
    html = b'<meta name="generator" content="WordPress 6.5.4">'
    items = _detect({}, html)
    wp = next((i for i in items if i.name == "WordPress"), None)
    assert wp is not None
    assert wp.version == "6.5.4"


def test_detect_meta_generator_with_reversed_attributes():
    html = b'<meta content="Joomla! 5.1.0" name="generator">'
    items = _detect({}, html)
    joomla = next((i for i in items if i.name == "Joomla"), None)
    assert joomla is not None
    assert joomla.version == "5.1.0"


def test_detect_laravel_from_cookie():
    items = _detect({"set-cookie": "laravel_session=abc; Path=/; HttpOnly"}, b"")
    assert any(i.name == "Laravel" for i in items)


def test_does_not_detect_django_from_generic_sessionid_cookie():
    items = _detect({"set-cookie": "sessionid=abc; Path=/; HttpOnly"}, b"")
    assert not any(i.name == "Django" for i in items)


def test_detect_cloudflare_from_cookie():
    items = _detect({"set-cookie": "__cf_bm=abc; Path=/; HttpOnly"}, b"")
    assert any(i.name == "Cloudflare" for i in items)


def test_detect_keeps_stronger_confidence_for_duplicate_tech():
    headers = {"set-cookie": "_ga=abc"}
    html = b"<script async src=\"https://www.google-analytics.com/analytics.js\"></script>"
    items = _detect(headers, html)
    ga = next((i for i in items if i.name == "Google Analytics"), None)
    assert ga is not None
    assert ga.confidence == "high"


def test_detect_woocommerce_implies_wordpress():
    html = b'<script src="/wp-content/plugins/woocommerce/assets/js/frontend/cart-fragments.js"></script>'
    items = _detect({}, html)
    names = [i.name for i in items]
    assert "WooCommerce" in names
    assert "WordPress" in names


def test_detect_common_hosting_headers():
    items = _detect({"x-nf-request-id": "01ABC", "x-vercel-cache": "HIT"}, b"")
    names = [i.name for i in items]
    assert "Netlify" in names
    assert "Vercel" in names


def test_detect_react_version_from_cdn_asset():
    html = b'<script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"></script>'
    items = _detect({}, html)
    react = next((i for i in items if i.name == "React"), None)
    assert react is not None
    assert react.version == "18.2.0"


def test_detect_payment_and_chat_widgets():
    html = b"""
    <script src="https://www.paypal.com/sdk/js?client-id=abc"></script>
    <script src="https://cdn.livechatinc.com/tracking.js"></script>
    """
    items = _detect({}, html)
    names = [i.name for i in items]
    assert "PayPal" in names
    assert "LiveChat" in names


def test_extract_asset_urls_normalizes_and_prioritizes_framework_assets():
    html = """
    <link rel="stylesheet" href="/styles/site.css">
    <script src="/static/js/main.abc123.js"></script>
    <script src="/_next/static/chunks/app/page.js"></script>
    <link rel="manifest" href="/asset-manifest.json">
    """
    urls = _extract_asset_urls("https://example.com/app", html)

    assert "https://example.com/_next/static/chunks/app/page.js" in urls
    assert "https://example.com/asset-manifest.json" in urls
    assert urls[0] == "https://example.com/_next/static/chunks/app/page.js"


def test_detect_from_asset_urls_without_fetching_bundle():
    items = _detect({}, b"<html></html>", asset_urls=[
        "https://example.com/_next/static/chunks/app/page.js",
        "https://example.com/asset-manifest.json",
    ])
    names = [i.name for i in items]

    assert "Next.js" in names
    assert "Create React App" in names
    nextjs = next(i for i in items if i.name == "Next.js")
    assert "asset-url" in nextjs.sources


def test_detect_from_fetched_asset_text():
    asset_text = "window.__NUXT__={}; import('./_payload.js');"
    items = _detect({}, b"<html></html>", asset_texts=[asset_text])
    names = [i.name for i in items]

    assert "Nuxt.js" in names
    assert "Vue.js" in names
    nuxt = next(i for i in items if i.name == "Nuxt.js")
    assert "asset-body" in nuxt.sources


def test_swagger_ui_does_not_claim_fastapi_without_fastapi_signal():
    html = b'<script src="/swagger-ui-bundle.js"></script><a href="/docs/oauth2-redirect">oauth</a>'
    items = _detect({}, html)
    names = [i.name for i in items]

    assert "Swagger UI" in names
    assert "FastAPI" not in names


def test_plain_react_text_does_not_detect_react_framework():
    html = b"<html><body>Reactive content and reaction icons only.</body></html>"
    items = _detect({}, html)

    assert not any(i.name == "React" for i in items)


def test_detect_merges_evidence_for_duplicate_tech():
    items = _detect({"x-powered-by": "Next.js"}, b'<script id="__NEXT_DATA__"></script>')
    nextjs = next(i for i in items if i.name == "Next.js")

    assert "header" in nextjs.sources
    assert "html" in nextjs.sources
    assert len(nextjs.evidence) >= 2


def test_detect_empty():
    items = _detect({}, b"<html><body>Hello</body></html>")
    assert isinstance(items, list)


# ── Integration: analyze_tech_stack with mock ─────────────────────

@pytest.mark.asyncio
async def test_analyze_tech_stack_success():
    fake_response = _response({"server": "nginx/1.25", "x-powered-by": "PHP/8.1"})
    html = b'<html><body><script src="/wp-content/plugins/x.js"></script></body></html>'

    with patch("app.analyzers.tech_stack_analyzer.fetch_html", return_value=(fake_response, html)), \
         patch("app.analyzers.tech_stack_analyzer._fetch_asset_texts", new=AsyncMock(return_value=[])):
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
