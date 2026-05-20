from dataclasses import dataclass, field

import httpx
import pytest

from app.analyzers.http_overview_analyzer import _detect_cdn
from app.analyzers.tech_stack_analyzer import _detect, _extract_asset_urls
from app.schemas.report import TechConfidence


@dataclass(frozen=True)
class TechExpectation:
    name: str
    confidence: TechConfidence | None = None
    required_sources: set[str] = field(default_factory=set)


@dataclass(frozen=True)
class AccuracyFixture:
    name: str
    headers: dict[str, str]
    html: str
    expected: tuple[TechExpectation, ...]
    absent: tuple[str, ...] = ()
    cdn_provider: str | None = None
    cdn_confidence: TechConfidence | None = None


FIXTURES: tuple[AccuracyFixture, ...] = (
    AccuracyFixture(
        name="next_vercel_cloudflare",
        headers={
            "x-vercel-id": "sin1::abc123",
            "cf-ray": "abc123-SIN",
            "server": "cloudflare",
        },
        html="""
        <html>
          <head>
            <script id="__NEXT_DATA__" type="application/json">{}</script>
            <script src="/_next/static/chunks/app/page.js"></script>
          </head>
        </html>
        """,
        expected=(
            TechExpectation("Next.js", "high", {"html", "asset-url"}),
            TechExpectation("React", "medium", {"inferred"}),
            TechExpectation("Vercel", "high", {"header"}),
            TechExpectation("Cloudflare", "high", {"header"}),
        ),
        absent=("WordPress", "Shopify", "Nuxt.js"),
        cdn_provider="Cloudflare",
        cdn_confidence="high",
    ),
    AccuracyFixture(
        name="wordpress_woocommerce",
        headers={},
        html="""
        <html>
          <head><meta name="generator" content="WordPress 6.5.4"></head>
          <body>
            <link rel="stylesheet" href="/wp-content/themes/store/style.css">
            <script src="/wp-content/plugins/woocommerce/assets/js/frontend/cart-fragments.js"></script>
          </body>
        </html>
        """,
        expected=(
            TechExpectation("WordPress", "high", {"html", "meta"}),
            TechExpectation("WooCommerce", "high", {"html", "asset-url"}),
        ),
        absent=("Shopify", "Next.js", "React"),
    ),
    AccuracyFixture(
        name="shopify_storefront",
        headers={
            "x-shopid": "12345",
            "set-cookie": "_shopify_s=abc; Path=/; Secure; HttpOnly",
        },
        html="""
        <html>
          <head>
            <script>window.Shopify = { theme: { id: 1 } };</script>
            <script src="https://cdn.shopify.com/shopifycloud/shopify/assets/storefront.js"></script>
          </head>
        </html>
        """,
        expected=(
            TechExpectation("Shopify", "high", {"header", "html", "asset-url", "cookie"}),
        ),
        absent=("WordPress", "WooCommerce", "Magento"),
    ),
    AccuracyFixture(
        name="nuxt_static_site",
        headers={},
        html="""
        <html>
          <head>
            <script>window.__NUXT__ = { data: [] };</script>
            <script src="/_nuxt/entry.abc123.js"></script>
          </head>
        </html>
        """,
        expected=(
            TechExpectation("Nuxt.js", "high", {"html", "asset-url"}),
            TechExpectation("Vue.js", "medium", {"inferred"}),
        ),
        absent=("Next.js", "React", "WordPress"),
    ),
    AccuracyFixture(
        name="jquery_bootstrap_static_page",
        headers={},
        html="""
        <html>
          <head>
            <link rel="stylesheet" href="/static/bootstrap-5.3.3.min.css">
            <script src="/static/jquery-3.7.1.min.js"></script>
          </head>
        </html>
        """,
        expected=(
            TechExpectation("Bootstrap", "high", {"html", "asset-url"}),
            TechExpectation("jQuery", "high", {"html", "asset-url"}),
        ),
        absent=("React", "Vue.js", "Angular", "Tailwind CSS"),
    ),
)


def _find(items, name: str):
    return next((item for item in items if item.name == name), None)


@pytest.mark.parametrize("fixture", FIXTURES, ids=[fixture.name for fixture in FIXTURES])
def test_accuracy_fixture_detects_expected_stack_without_known_false_positives(fixture: AccuracyFixture):
    asset_urls = _extract_asset_urls("https://example.com", fixture.html)
    items = _detect(fixture.headers, fixture.html.encode(), asset_urls=asset_urls)
    names = {item.name for item in items}

    for expected in fixture.expected:
        item = _find(items, expected.name)
        assert item is not None, f"{fixture.name}: expected {expected.name}, got {sorted(names)}"
        if expected.confidence:
            assert item.confidence == expected.confidence
        if expected.required_sources:
            assert expected.required_sources <= set(item.sources)
        assert item.evidence

    for absent in fixture.absent:
        assert absent not in names, f"{fixture.name}: unexpected detection {absent}"

    provider, confidence, evidence = _detect_cdn(httpx.Headers(fixture.headers))
    assert provider == fixture.cdn_provider
    assert confidence == fixture.cdn_confidence
    if provider:
        assert evidence


def test_accuracy_fixture_avoids_generic_fastly_and_framework_false_positives():
    html = """
    <html>
      <body>
        Reactive UI copy, reaction counters, grid and flex utility words.
        <script src="/assets/main.js"></script>
      </body>
    </html>
    """
    headers = {
        "x-served-by": "origin-app-01",
        "set-cookie": "sessionid=abc; Path=/; HttpOnly",
    }

    items = _detect(headers, html.encode(), asset_urls=_extract_asset_urls("https://example.com", html))
    names = {item.name for item in items}
    provider, confidence, evidence = _detect_cdn(httpx.Headers(headers))

    assert "React" not in names
    assert "Tailwind CSS" not in names
    assert "Django" not in names
    assert provider is None
    assert confidence is None
    assert evidence == []
