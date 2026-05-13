import re
from typing import NamedTuple

import httpx

from app.schemas.report import TechStackItem, TechCategory, TechConfidence
from app.schemas.analyzer import AnalyzerResult
from app.utils.safe_fetch import fetch_html


class _Rule(NamedTuple):
    name:       str
    category:   TechCategory
    confidence: TechConfidence
    header:     str | None = None      # substring to match in header value (case-insensitive)
    header_key: str | None = None      # header name to inspect
    html:       str | None = None      # regex against HTML body
    version_re: str | None = None      # capture group 1 = version string


_RULES: list[_Rule] = [
    # ── Web Servers ───────────────────────────────────────────────
    _Rule("nginx",         "Web Server", "high",  header="nginx",      header_key="server"),
    _Rule("Apache",        "Web Server", "high",  header="apache",     header_key="server"),
    _Rule("Caddy",         "Web Server", "high",  header="caddy",      header_key="server"),
    _Rule("LiteSpeed",     "Web Server", "high",  header="litespeed",  header_key="server"),
    _Rule("OpenResty",     "Web Server", "high",  header="openresty",  header_key="server"),
    _Rule("Gunicorn",      "Web Server", "high",  header="gunicorn",   header_key="server"),
    _Rule("Microsoft IIS", "Web Server", "high",  header="iis",        header_key="server",
          version_re=r"IIS/([\d.]+)"),
    _Rule("PHP",           "Web Server", "high",  header="php",        header_key="x-powered-by",
          version_re=r"PHP/([\d.]+)"),
    _Rule("ASP.NET",       "Web Server", "high",  header="asp.net",    header_key="x-powered-by"),

    # ── CDN / Edge ────────────────────────────────────────────────
    _Rule("Cloudflare",     "CDN", "high", header="cloudflare",   header_key="server"),
    _Rule("Cloudflare",     "CDN", "high", header_key="cf-ray",          header=""),
    _Rule("Cloudflare",     "CDN", "high", header_key="cf-cache-status", header=""),
    _Rule("AWS CloudFront", "CDN", "high", header="cloudfront",   header_key="via"),
    _Rule("AWS CloudFront", "CDN", "high", header_key="x-amz-cf-id",     header=""),
    _Rule("Fastly",         "CDN", "high", header="fastly",       header_key="via"),
    _Rule("Fastly",         "CDN", "high", header_key="x-served-by",     header="cache"),
    _Rule("Akamai",         "CDN", "high", header_key="x-akamai-transformed", header=""),
    _Rule("Akamai",         "CDN", "high", header_key="x-check-cacheable",    header=""),
    _Rule("Azure CDN",      "CDN", "high", header_key="x-msedge-ref",    header=""),
    _Rule("BunnyCDN",       "CDN", "high", header_key="cdn-requestid",   header=""),
    _Rule("Sucuri",         "CDN", "high", header_key="x-sucuri-id",      header=""),

    # ── Hosting ───────────────────────────────────────────────────
    _Rule("Vercel",      "Hosting", "high", header_key="x-vercel-id",       header=""),
    _Rule("Netlify",     "Hosting", "high", header="netlify",               header_key="server"),
    _Rule("GitHub Pages","Hosting", "high", header="github.com",            header_key="server"),
    _Rule("Shopify",     "Hosting", "high", header_key="x-shopid",          header=""),
    _Rule("Shopify",     "Hosting", "high", html=r'cdn\.shopify\.com|Shopify\.theme'),
    _Rule("Webflow",     "Hosting", "high", html=r'webflow\.com/|data-wf-'),
    _Rule("Wix",         "Hosting", "high", html=r'static\.wixstatic\.com|wixsite\.com'),
    _Rule("Squarespace", "Hosting", "high", html=r'squarespace\.com|static1\.squarespace\.com'),
    _Rule("Framer",      "Hosting", "high", html=r'framer\.com/|framerusercontent\.com'),

    # ── Backend Frameworks (x-powered-by) ────────────────────────
    _Rule("Express",     "Backend Framework", "medium", header="express",  header_key="x-powered-by"),
    _Rule("Next.js",     "JavaScript Framework", "high", header="next.js", header_key="x-powered-by"),

    # ── Backend Frameworks (HTML signals) ────────────────────────
    _Rule("Laravel",        "Backend Framework", "high",   html=r'laravel_token|<meta name="csrf-token"'),
    _Rule("Django",         "Backend Framework", "high",   html=r'csrfmiddlewaretoken|name="csrftoken"'),
    _Rule("Ruby on Rails",  "Backend Framework", "medium", html=r'rails-ujs|data-turbo-|data-turbolinks'),
    _Rule("Spring Boot",    "Backend Framework", "medium", html=r'spring-boot|Whitelabel Error Page'),
    _Rule("CodeIgniter",    "Backend Framework", "medium", html=r'ci_session|CodeIgniter'),
    _Rule("Symfony",        "Backend Framework", "medium", html=r'symfony|Symfony'),

    # ── JS Frameworks ─────────────────────────────────────────────
    _Rule("Next.js",    "JavaScript Framework", "high",   html=r'/_next/static|__NEXT_DATA__'),
    _Rule("React",      "JavaScript Framework", "high",   html=r'react(?:\.min)?\.js|data-reactroot|__REACT_'),
    _Rule("Vue.js",     "JavaScript Framework", "high",   html=r'vue(?:\.min)?\.js|data-v-app|__vue_app__|__VUE__'),
    _Rule("Nuxt.js",    "JavaScript Framework", "high",   html=r'__nuxt__|/_nuxt/'),
    _Rule("Angular",    "JavaScript Framework", "high",   html=r'angular(?:\.min)?\.js|ng-version='),
    _Rule("SvelteKit",  "JavaScript Framework", "high",   html=r'__sveltekit_data|/_app/immutable/'),
    _Rule("Svelte",     "JavaScript Framework", "medium", html=r'svelte'),
    _Rule("Gatsby",     "JavaScript Framework", "high",   html=r'___gatsby|gatsby-chunk|gatsby-image'),
    _Rule("Remix",      "JavaScript Framework", "high",   html=r'__remixContext|__remixManifest'),
    _Rule("Astro",      "JavaScript Framework", "high",   html=r'data-astro-cid|astro-island|@astrojs'),
    _Rule("Ember.js",   "JavaScript Framework", "medium", html=r'ember(?:\.min)?\.js|ember-application'),
    _Rule("Alpine.js",  "JavaScript Framework", "medium", html=r'alpinejs|alpine\.min\.js|x-data='),
    _Rule("HTMX",       "JavaScript Framework", "high",   html=r'htmx\.org|hx-boost|hx-get=|hx-post='),
    _Rule("Preact",     "JavaScript Framework", "medium", html=r'preact(?:\.min)?\.js'),
    _Rule("Solid.js",   "JavaScript Framework", "medium", html=r'solid-js|@solidjs'),
    _Rule("Stimulus",   "JavaScript Framework", "medium", html=r'@hotwired/stimulus|stimulus\.js'),
    _Rule("jQuery",     "JavaScript Framework", "high",   html=r'jquery(?:[.-][\d.]+)?(?:\.min)?\.js',
          version_re=r'jquery[.-]([\d.]+)(?:\.min)?\.js'),

    # ── CSS Frameworks ────────────────────────────────────────────
    _Rule("Bootstrap",   "CSS Framework", "high",   html=r'bootstrap(?:\.min)?\.css',
          version_re=r'bootstrap[/@]([\d.]+)'),
    _Rule("Tailwind CSS","CSS Framework", "medium", html=r'tailwindcss|tailwind(?:\.min)?\.css'),
    _Rule("Bulma",       "CSS Framework", "medium", html=r'bulma(?:\.min)?\.css'),
    _Rule("Foundation",  "CSS Framework", "medium", html=r'foundation(?:\.min)?\.css'),
    _Rule("Materialize", "CSS Framework", "medium", html=r'materialize(?:\.min)?\.css'),
    _Rule("Font Awesome","CSS Framework", "high",   html=r'font-awesome|fontawesome\.com|fa-solid|fa-brands'),
    _Rule("Ant Design",  "CSS Framework", "medium", html=r'antd(?:\.min)?\.css|ant-design'),

    # ── CMS ───────────────────────────────────────────────────────
    _Rule("WordPress",  "CMS", "high",   html=r'/wp-content/|/wp-includes/|wp-json'),
    _Rule("Drupal",     "CMS", "high",   html=r'Drupal\.settings|/sites/default/files/|drupal\.js'),
    _Rule("Joomla",     "CMS", "high",   html=r'/components/com_|Joomla!|/media/jui/'),
    _Rule("Ghost",      "CMS", "high",   html=r'ghost/core|content="Ghost '),
    _Rule("Typo3",      "CMS", "high",   html=r'typo3conf|TYPO3\.settings'),
    _Rule("PrestaShop", "CMS", "high",   html=r'prestashop|PrestaShop'),
    _Rule("Magento",    "CMS", "high",   html=r'Mage\.|/pub/static/frontend/|requirejs/require\.js'),
    _Rule("OpenCart",   "CMS", "medium", html=r'route=common/home|catalog/view/theme'),

    # ── Analytics ─────────────────────────────────────────────────
    _Rule("Google Analytics",       "Analytics", "high",   html=r'google-analytics\.com/|gtag\(|\"UA-'),
    _Rule("Google Tag Manager",     "Analytics", "high",   html=r'googletagmanager\.com/gtm\.js'),
    _Rule("Hotjar",                 "Analytics", "high",   html=r'hotjar\.com/c/hotjar|static\.hotjar\.com'),
    _Rule("Microsoft Clarity",      "Analytics", "high",   html=r'clarity\.ms/tag|microsoft.*clarity'),
    _Rule("Facebook Pixel",         "Analytics", "high",   html=r'connect\.facebook\.net.*fbevents|fbq\('),
    _Rule("Matomo",                 "Analytics", "high",   html=r'matomo\.js|piwik\.js'),
    _Rule("Plausible",              "Analytics", "high",   html=r'plausible\.io/js/'),
    _Rule("Segment",                "Analytics", "high",   html=r'cdn\.segment\.com|analytics\.load\('),
    _Rule("HubSpot",                "Analytics", "high",   html=r'js\.hs-scripts\.com|hs-analytics'),
    _Rule("Mixpanel",               "Analytics", "high",   html=r'cdn\.mxpanel\.com|mixpanel\.init'),
    _Rule("Amplitude",              "Analytics", "high",   html=r'cdn\.amplitude\.com|amplitude\.getInstance'),
    _Rule("PostHog",                "Analytics", "high",   html=r'posthog\.io|posthog\.js'),
    _Rule("Heap",                   "Analytics", "medium", html=r'heapanalytics\.com|heap\.load'),
    _Rule("Cloudflare Web Analytics","Analytics","high",   html=r'static\.cloudflareinsights\.com'),
    _Rule("Fathom",                 "Analytics", "high",   html=r'cdn\.usefathom\.com'),
    _Rule("TikTok Pixel",           "Analytics", "high",   html=r'analytics\.tiktok\.com'),

    # ── Other ─────────────────────────────────────────────────────
    _Rule("Google Fonts", "Other", "high",   html=r'fonts\.googleapis\.com'),
    _Rule("Sentry",       "Other", "high",   html=r'sentry\.io|@sentry/|Sentry\.init'),
    _Rule("Stripe",       "Other", "high",   html=r'js\.stripe\.com'),
    _Rule("reCAPTCHA",    "Other", "high",   html=r'google\.com/recaptcha|grecaptcha'),
    _Rule("hCaptcha",     "Other", "high",   html=r'hcaptcha\.com'),
    _Rule("Intercom",     "Other", "high",   html=r'widget\.intercom\.io|Intercom\('),
    _Rule("Zendesk",      "Other", "high",   html=r'zendesk\.com/embeddable_framework|zopim'),
    _Rule("Crisp",        "Other", "high",   html=r'client\.crisp\.chat'),
    _Rule("Tidio",        "Other", "high",   html=r'code\.tidio\.co'),
    _Rule("Webpack",      "Other", "medium", html=r'__webpack_require__|webpackChunk'),
    _Rule("Vite",         "Other", "medium", html=r'/@vite/client|vitepress'),
]

# Display order for categories in the UI
_CATEGORY_ORDER: dict[str, int] = {
    "Web Server": 0, "CDN": 1, "Hosting": 2,
    "Backend Framework": 3, "JavaScript Framework": 4, "CSS Framework": 5,
    "CMS": 6, "Analytics": 7, "Database": 8, "Other": 9,
}


def _detect(headers: dict[str, str], html: bytes) -> list[TechStackItem]:
    seen: set[str] = set()
    items: list[TechStackItem] = []

    html_text = html.decode("utf-8", errors="replace")

    for rule in _RULES:
        if rule.name in seen:
            continue

        matched = False
        version: str | None = None

        if rule.header_key and rule.header is not None:
            hval = headers.get(rule.header_key.lower(), "")
            if rule.header == "" and hval:
                matched = True
            elif rule.header and rule.header.lower() in hval.lower():
                matched = True

        if not matched and rule.html:
            m = re.search(rule.html, html_text, re.IGNORECASE)
            if m:
                matched = True

        if matched:
            if rule.version_re:
                combined = " ".join(headers.values()) + " " + html_text
                vm = re.search(rule.version_re, combined, re.IGNORECASE)
                if vm:
                    version = vm.group(1)

            items.append(TechStackItem(
                name=rule.name,
                category=rule.category,
                confidence=rule.confidence,
                version=version,
            ))
            seen.add(rule.name)

    items.sort(key=lambda x: (_CATEGORY_ORDER.get(x.category, 99), x.name))
    return items


async def analyze_tech_stack(normalized_url: str) -> AnalyzerResult:
    try:
        response, body = await fetch_html(normalized_url)
        headers = {k.lower(): v for k, v in response.headers.items()}
        items = _detect(headers, body)
    except httpx.TimeoutException:
        return AnalyzerResult(
            key="techStack", status="error",
            data=[], findings=[],
            errors=["Request timed out"],
        )
    except httpx.RequestError as exc:
        return AnalyzerResult(
            key="techStack", status="error",
            data=[], findings=[],
            errors=[str(exc)],
        )

    return AnalyzerResult(key="techStack", status="success", data=items, findings=[])
