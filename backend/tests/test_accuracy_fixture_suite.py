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
    AccuracyFixture(
        name="astro_netlify_site",
        headers={"x-nf-request-id": "01HTEXAMPLE"},
        html="""
        <html>
          <head>
            <script type="module" src="/_astro/entry.client.abc123.js"></script>
          </head>
          <body>
            <astro-island uid="abc" component-url="/_astro/Header.abc123.js"></astro-island>
          </body>
        </html>
        """,
        expected=(
            TechExpectation("Astro", "high", {"html", "asset-url"}),
            TechExpectation("Netlify", "high", {"header"}),
        ),
        absent=("Next.js", "React", "SvelteKit", "WordPress"),
        cdn_provider="Netlify",
        cdn_confidence="high",
    ),
    AccuracyFixture(
        name="sveltekit_static_site",
        headers={},
        html="""
        <html>
          <head>
            <script type="module" src="/_app/immutable/entry/start.abc123.js"></script>
            <script>window.__sveltekit_data = { nodes: [] };</script>
          </head>
        </html>
        """,
        expected=(
            TechExpectation("SvelteKit", "high", {"html", "asset-url"}),
            TechExpectation("Svelte", "medium", {"inferred"}),
        ),
        absent=("Next.js", "React", "Vue.js", "Nuxt.js"),
    ),
    AccuracyFixture(
        name="docusaurus_docs_site",
        headers={},
        html="""
        <html>
          <head>
            <script>window.__docusaurus = { siteConfig: {} };</script>
          </head>
          <body>
            <nav class="navbar__brand">Docs</nav>
            <main class="theme-doc-markdown markdown">Guide</main>
          </body>
        </html>
        """,
        expected=(
            TechExpectation("Docusaurus", "high", {"html"}),
        ),
        absent=("React", "Next.js", "MkDocs", "Hugo"),
    ),
    AccuracyFixture(
        name="mkdocs_material_site",
        headers={},
        html="""
        <html data-md-color-scheme="slate">
          <head>
            <meta name="generator" content="mkdocs-1.6.0, mkdocs-material-9.5.0">
          </head>
          <body>
            <header class="md-header">
              <a class="md-header__button">Docs</a>
            </header>
          </body>
        </html>
        """,
        expected=(
            TechExpectation("MkDocs", "high", {"html"}),
        ),
        absent=("Docusaurus", "Hugo", "React"),
    ),
    AccuracyFixture(
        name="hugo_static_site",
        headers={},
        html="""
        <html>
          <head>
            <meta name="generator" content="Hugo 0.124.1">
          </head>
          <body>Static site</body>
        </html>
        """,
        expected=(
            TechExpectation("Hugo", "high", {"meta"}),
        ),
        absent=("MkDocs", "Docusaurus", "WordPress"),
    ),
    AccuracyFixture(
        name="webflow_marketing_site",
        headers={},
        html="""
        <html data-wf-page="64fabc123" data-wf-site="64fdef456">
          <head>
            <link rel="stylesheet" href="https://uploads-ssl.webflow.com/64fdef456/css/site.webflow.css">
            <script src="https://assets.website-files.com/64fdef456/js/webflow.js"></script>
          </head>
        </html>
        """,
        expected=(
            TechExpectation("Webflow", "high", {"html", "asset-url"}),
        ),
        absent=("Wix", "Squarespace", "Framer", "WordPress"),
    ),
    AccuracyFixture(
        name="wix_site",
        headers={},
        html="""
        <html>
          <head>
            <script src="https://static.wixstatic.com/services/wix-thunderbolt/dist/main.js"></script>
          </head>
          <body>
            <a href="https://example.wixsite.com/home">Home</a>
          </body>
        </html>
        """,
        expected=(
            TechExpectation("Wix", "high", {"html", "asset-url"}),
        ),
        absent=("Webflow", "Squarespace", "Framer", "WordPress"),
    ),
    AccuracyFixture(
        name="squarespace_site",
        headers={},
        html="""
        <html>
          <head>
            <script src="https://static1.squarespace.com/static/vta/commerce.js"></script>
          </head>
          <body>
            <a href="https://www.squarespace.com">Built with Squarespace</a>
          </body>
        </html>
        """,
        expected=(
            TechExpectation("Squarespace", "high", {"html", "asset-url"}),
        ),
        absent=("Webflow", "Wix", "Framer", "WordPress"),
    ),
    AccuracyFixture(
        name="framer_site",
        headers={},
        html="""
        <html>
          <head>
            <script type="module" src="https://framerusercontent.com/sites/site-id/script.js"></script>
          </head>
          <body>
            <a href="https://framer.com/projects/site">Prototype</a>
          </body>
        </html>
        """,
        expected=(
            TechExpectation("Framer", "high", {"html", "asset-url"}),
        ),
        absent=("Webflow", "Wix", "Squarespace", "WordPress"),
    ),
    AccuracyFixture(
        name="analytics_suite",
        headers={},
        html="""
        <html>
          <head>
            <script async src="https://www.googletagmanager.com/gtm.js?id=GTM-ABC123"></script>
            <script async src="https://www.google-analytics.com/analytics.js"></script>
            <script>
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('config', 'G-ABC123');
              fbq('init', '123456789');
            </script>
            <script src="https://www.clarity.ms/tag/abc123"></script>
            <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
          </head>
        </html>
        """,
        expected=(
            TechExpectation("Google Tag Manager", "high", {"html", "asset-url"}),
            TechExpectation("Google Analytics", "high", {"html", "asset-url"}),
            TechExpectation("Microsoft Clarity", "high", {"html", "asset-url"}),
            TechExpectation("Facebook Pixel", "high", {"html", "asset-url"}),
        ),
        absent=("PostHog", "Matomo", "Plausible", "HubSpot"),
    ),
    AccuracyFixture(
        name="checkout_payment_suite",
        headers={},
        html="""
        <html>
          <head>
            <script src="https://js.stripe.com/v3/"></script>
            <script src="https://www.paypal.com/sdk/js?client-id=abc"></script>
            <script src="https://www.google.com/recaptcha/api.js"></script>
          </head>
        </html>
        """,
        expected=(
            TechExpectation("Stripe", "high", {"html", "asset-url"}),
            TechExpectation("PayPal", "high", {"html", "asset-url"}),
            TechExpectation("reCAPTCHA", "high", {"html", "asset-url"}),
        ),
        absent=("Braintree", "Razorpay", "hCaptcha", "Cloudflare Turnstile"),
    ),
    AccuracyFixture(
        name="support_and_monitoring_suite",
        headers={"set-cookie": "intercom-id-app=abc; hubspotutk=xyz; Path=/"},
        html="""
        <html>
          <head>
            <script>
              Sentry.init({ dsn: 'https://abc@sentry.io/123' });
              window.Intercom('boot', { app_id: 'abc' });
            </script>
            <script src="https://widget.intercom.io/widget/abc"></script>
            <script src="https://static.zdassets.com/embeddable_framework/main.js"></script>
            <script src="https://client.crisp.chat/l.js"></script>
            <script src="https://code.tidio.co/abc123.js"></script>
            <script src="https://js.hs-scripts.com/123456.js"></script>
          </head>
        </html>
        """,
        expected=(
            TechExpectation("Sentry", "high", {"html"}),
            TechExpectation("Intercom", "high", {"html", "asset-url", "cookie"}),
            TechExpectation("Zendesk", "high", {"html", "asset-url"}),
            TechExpectation("Crisp", "high", {"html", "asset-url"}),
            TechExpectation("Tidio", "high", {"html", "asset-url"}),
            TechExpectation("HubSpot", "high", {"html", "asset-url", "cookie"}),
        ),
        absent=("Drift", "LiveChat", "PostHog"),
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
