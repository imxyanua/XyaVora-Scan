import asyncio
import re
from typing import NamedTuple
from urllib.parse import urljoin, urlparse

import httpx

from app.core.config import settings
from app.schemas.report import TechStackItem, TechCategory, TechConfidence
from app.schemas.analyzer import AnalyzerResult
from app.utils.safe_fetch import fetch_html, validate_public_http_url

_MAX_ASSET_CANDIDATES = 24
_MAX_ASSET_FETCHES = 5
_MAX_ASSET_BYTES = 96_000
_ASSET_USER_AGENT = "XyaVora-Scan/0.1 (passive-security-scanner; tech-stack-assets)"


class _Rule(NamedTuple):
    name:       str
    category:   TechCategory
    confidence: TechConfidence
    header:     str | None = None      # substring to match in header value (case-insensitive)
    header_key: str | None = None      # header name to inspect
    html:       str | None = None      # regex against HTML body
    cookie:     str | None = None      # regex against Set-Cookie header values
    meta:       str | None = None      # regex against meta generator content
    version_re: str | None = None      # capture group 1 = version string


_RULES: list[_Rule] = [
    # ── Web Servers ───────────────────────────────────────────────
    _Rule("nginx",         "Web Server", "high",  header="nginx",      header_key="server"),
    _Rule("Apache",        "Web Server", "high",  header="apache",     header_key="server"),
    _Rule("Caddy",         "Web Server", "high",  header="caddy",      header_key="server"),
    _Rule("LiteSpeed",     "Web Server", "high",  header="litespeed",  header_key="server"),
    _Rule("OpenResty",     "Web Server", "high",  header="openresty",  header_key="server"),
    _Rule("Tengine",       "Web Server", "high",  header="tengine",    header_key="server"),
    _Rule("Gunicorn",      "Web Server", "high",  header="gunicorn",   header_key="server"),
    _Rule("Uvicorn",       "Web Server", "medium", header="uvicorn",   header_key="server"),
    _Rule("Kestrel",       "Web Server", "medium", header="kestrel",   header_key="server"),
    _Rule("Cowboy",        "Web Server", "medium", header="cowboy",    header_key="server"),
    _Rule("Envoy",         "Web Server", "medium", header="envoy",     header_key="server"),
    _Rule("Tomcat",        "Web Server", "medium", header="tomcat",    header_key="server"),
    _Rule("Jetty",         "Web Server", "medium", header="jetty",     header_key="server"),
    _Rule("Microsoft IIS", "Web Server", "high",  header="iis",        header_key="server",
          version_re=r"IIS/([\d.]+)"),
    _Rule("PHP",           "Web Server", "high",  header="php",        header_key="x-powered-by",
          version_re=r"PHP/([\d.]+)"),
    _Rule("ASP.NET",       "Web Server", "high",  header="asp.net",    header_key="x-powered-by"),
    _Rule("Werkzeug",      "Web Server", "medium", header="werkzeug",  header_key="server"),

    # ── CDN / Edge ────────────────────────────────────────────────
    _Rule("Cloudflare",     "CDN", "high", header="cloudflare",   header_key="server"),
    _Rule("Cloudflare",     "CDN", "high", header_key="cf-ray",          header=""),
    _Rule("Cloudflare",     "CDN", "high", header_key="cf-cache-status", header=""),
    _Rule("Cloudflare",     "CDN", "high", cookie=r'__cf_bm|cf_clearance'),
    _Rule("AWS CloudFront", "CDN", "high", header="cloudfront",   header_key="via"),
    _Rule("AWS CloudFront", "CDN", "high", header="cloudfront",   header_key="x-cache"),
    _Rule("AWS CloudFront", "CDN", "high", header_key="x-amz-cf-id",     header=""),
    _Rule("Fastly",         "CDN", "high", header="fastly",       header_key="via"),
    _Rule("Fastly",         "CDN", "high", header_key="x-served-by",     header="cache"),
    _Rule("Akamai",         "CDN", "high", header_key="x-akamai-transformed", header=""),
    _Rule("Akamai",         "CDN", "high", header_key="x-check-cacheable",    header=""),
    _Rule("Azure CDN",      "CDN", "high", header_key="x-msedge-ref",    header=""),
    _Rule("BunnyCDN",       "CDN", "high", header_key="cdn-requestid",   header=""),
    _Rule("Sucuri",         "CDN", "high", header_key="x-sucuri-id",      header=""),
    _Rule("Imperva Incapsula","CDN","high", cookie=r'incap_ses|visid_incap'),
    _Rule("QUIC.cloud",      "CDN", "high", header_key="x-qc-cache",       header=""),
    _Rule("StackPath",       "CDN", "medium", header_key="x-sp-cache",     header=""),
    _Rule("KeyCDN",          "CDN", "medium", header_key="x-edge-location", header=""),

    # ── Hosting ───────────────────────────────────────────────────
    _Rule("Vercel",      "Hosting", "high", header_key="x-vercel-id",       header=""),
    _Rule("Vercel",      "Hosting", "high", header_key="x-vercel-cache",    header=""),
    _Rule("Netlify",     "Hosting", "high", header="netlify",               header_key="server"),
    _Rule("Netlify",     "Hosting", "high", header_key="x-nf-request-id",    header=""),
    _Rule("GitHub Pages","Hosting", "high", header="github.com",            header_key="server"),
    _Rule("Render",      "Hosting", "medium", header_key="x-render-origin-server", header=""),
    _Rule("Fly.io",      "Hosting", "medium", header_key="fly-request-id",   header=""),
    _Rule("Heroku",      "Hosting", "medium", header="heroku",              header_key="via"),
    _Rule("Pantheon",    "Hosting", "high", header_key="x-pantheon-styx-hostname", header=""),
    _Rule("WP Engine",   "Hosting", "high", header_key="x-wpengine-cache", header=""),
    _Rule("Kinsta",      "Hosting", "high", header_key="x-kinsta-cache", header=""),
    _Rule("Platform.sh", "Hosting", "medium", header_key="x-platformsh-cache", header=""),
    _Rule("WordPress.com","Hosting","high", header_key="x-hacker", header=""),
    _Rule("Shopify",     "Hosting", "high", header_key="x-shopid",          header=""),
    _Rule("Shopify",     "Hosting", "high", html=r'cdn\.shopify\.com|Shopify\.theme|shopifycdn\.net'),
    _Rule("Shopify",     "Hosting", "high", cookie=r'_shopify_[sy]|_orig_referrer|cart_sig'),
    _Rule("Webflow",     "Hosting", "high", html=r'webflow\.com/|data-wf-'),
    _Rule("Wix",         "Hosting", "high", html=r'static\.wixstatic\.com|wixsite\.com'),
    _Rule("Squarespace", "Hosting", "high", html=r'squarespace\.com|static1\.squarespace\.com'),
    _Rule("Framer",      "Hosting", "high", html=r'framer\.com/|framerusercontent\.com'),

    # ── Backend Frameworks (x-powered-by) ────────────────────────
    _Rule("Express",     "Backend Framework", "medium", header="express",  header_key="x-powered-by"),
    _Rule("Express",     "Backend Framework", "medium", cookie=r'connect\.sid'),
    _Rule("Strapi",      "Backend Framework", "high", header="strapi", header_key="x-powered-by"),
    _Rule("Strapi",      "Backend Framework", "high", html=r'strapi\.io|/uploads/.*strapi'),
    _Rule("Next.js",     "JavaScript Framework", "high", header="next.js", header_key="x-powered-by"),
    _Rule("Next.js",     "JavaScript Framework", "high", header_key="x-nextjs-cache", header=""),

    # ── Backend Frameworks (HTML signals) ────────────────────────
    _Rule("Laravel",        "Backend Framework", "high",   html=r'laravel_token|<meta name="csrf-token"'),
    _Rule("Laravel",        "Backend Framework", "high",   cookie=r'laravel_session|XSRF-TOKEN'),
    _Rule("Django",         "Backend Framework", "high",   html=r'csrfmiddlewaretoken|name="csrftoken"'),
    _Rule("Django",         "Backend Framework", "medium", cookie=r'csrftoken'),
    _Rule("Ruby on Rails",  "Backend Framework", "medium", html=r'rails-ujs|data-turbo-|data-turbolinks'),
    _Rule("Ruby on Rails",  "Backend Framework", "medium", cookie=r'_session_id'),
    _Rule("Spring Boot",    "Backend Framework", "medium", html=r'spring-boot|Whitelabel Error Page'),
    _Rule("CodeIgniter",    "Backend Framework", "medium", html=r'ci_session|CodeIgniter'),
    _Rule("Symfony",        "Backend Framework", "medium", html=r'symfony|Symfony'),
    _Rule("Phoenix",        "Backend Framework", "medium", html=r'phoenix_html|phoenix_live_view|data-phx-'),
    _Rule("FastAPI",        "Backend Framework", "medium", html=r'FastAPI|fastapi'),
    _Rule("Swagger UI",     "Other", "medium", html=r'/docs/oauth2-redirect|swagger-ui|swagger-ui-bundle'),

    # ── JS Frameworks ─────────────────────────────────────────────
    _Rule("Next.js",    "JavaScript Framework", "high",   html=r'/_next/(?:static|image|data)|__NEXT_DATA__|next-route-announcer|self\.__next_f'),
    _Rule("React",      "JavaScript Framework", "high",   html=r'react(?:-dom)?(?:\.production)?(?:\.min)?\.js|data-reactroot|__REACT_|react-dom',
          version_re=r'react(?:-dom)?[@./-]([\d.]+)(?:/[^"\']*)?(?:\.production)?(?:\.min)?\.js'),
    _Rule("Vue.js",     "JavaScript Framework", "high",   html=r'vue(?:\.runtime)?(?:\.global)?(?:\.prod)?(?:\.min)?\.js|data-v-app|__vue_app__|__VUE__|createApp\(',
          version_re=r'vue[./-]([\d.]+)(?:\.runtime)?(?:\.global)?(?:\.prod)?(?:\.min)?\.js'),
    _Rule("Nuxt.js",    "JavaScript Framework", "high",   html=r'__NUXT__|__nuxt__|/_nuxt/|_payload\.js|nuxtApp'),
    _Rule("Angular",    "JavaScript Framework", "high",   html=r'angular(?:\.min)?\.js|ng-version|ng-app|_ngcontent-',
          version_re=r'angular[./-]([\d.]+)(?:\.min)?\.js'),
    _Rule("SvelteKit",  "JavaScript Framework", "high",   html=r'__sveltekit_data|/_app/immutable/|sveltekit:start'),
    _Rule("Svelte",     "JavaScript Framework", "medium", html=r'svelte(?:\.min)?\.js|data-svelte-h|svelte-[a-z0-9]'),
    _Rule("Gatsby",     "JavaScript Framework", "high",   html=r'___gatsby|gatsby-chunk|gatsby-image'),
    _Rule("Remix",      "JavaScript Framework", "high",   html=r'__remixContext|__remixManifest'),
    _Rule("Astro",      "JavaScript Framework", "high",   html=r'data-astro-cid|astro-island|@astrojs|/_astro/'),
    _Rule("Qwik",       "JavaScript Framework", "high",   html=r'q:container|q:base|/build/q-'),
    _Rule("Create React App", "JavaScript Framework", "medium", html=r'asset-manifest\.json|static/js/main\.[a-f0-9]+\.js|react-scripts'),
    _Rule("Vite",       "JavaScript Framework", "medium", html=r'/assets/index-[A-Za-z0-9_-]+\.js|@vite/client|vite/modulepreload-polyfill'),
    _Rule("Ember.js",   "JavaScript Framework", "medium", html=r'ember(?:\.min)?\.js|ember-application'),
    _Rule("Alpine.js",  "JavaScript Framework", "medium", html=r'alpinejs|alpine\.min\.js|x-data='),
    _Rule("HTMX",       "JavaScript Framework", "high",   html=r'htmx\.org|hx-boost|hx-get=|hx-post='),
    _Rule("Preact",     "JavaScript Framework", "medium", html=r'preact(?:\.min)?\.js'),
    _Rule("Solid.js",   "JavaScript Framework", "medium", html=r'solid-js|@solidjs'),
    _Rule("Stimulus",   "JavaScript Framework", "medium", html=r'@hotwired/stimulus|stimulus\.js'),
    _Rule("jQuery",     "JavaScript Framework", "high",   html=r'jquery(?:[.-][\d.]+)?(?:\.min)?\.js',
          version_re=r'jquery[.-]([\d.]+)(?:\.min)?\.js'),
    _Rule("MooTools",   "JavaScript Framework", "medium", html=r'mootools(?:\.min)?\.js'),
    _Rule("Prototype",  "JavaScript Framework", "medium", html=r'prototype(?:\.min)?\.js'),

    # ── CSS Frameworks ────────────────────────────────────────────
    _Rule("Bootstrap",   "CSS Framework", "high",   html=r'bootstrap(?:[.-][\d.]+)?(?:\.bundle)?(?:\.min)?\.(?:css|js)|bootstrap[/@]',
          version_re=r'bootstrap(?:[/@-])([\d.]+)'),
    _Rule("Tailwind CSS","CSS Framework", "medium", html=r'tailwindcss|tailwind(?:\.min)?\.css|class=["\'][^"\']*(?:sm:|md:|lg:|xl:|2xl:|space-x-|space-y-|bg-\[[^\]]+\]|text-\[[^\]]+\])'),
    _Rule("Bulma",       "CSS Framework", "medium", html=r'bulma(?:\.min)?\.css'),
    _Rule("Foundation",  "CSS Framework", "medium", html=r'foundation(?:\.min)?\.css'),
    _Rule("Materialize", "CSS Framework", "medium", html=r'materialize(?:\.min)?\.css'),
    _Rule("Font Awesome","CSS Framework", "high",   html=r'font-awesome|fontawesome\.com|fa-solid|fa-brands'),
    _Rule("Ant Design",  "CSS Framework", "medium", html=r'antd(?:\.min)?\.css|ant-design'),
    _Rule("Material UI", "CSS Framework", "medium", html=r'@mui/material|Mui[A-Z][A-Za-z]+-root|data-mui-color-scheme'),
    _Rule("Chakra UI",   "CSS Framework", "medium", html=r'chakra-ui|chakra-ui-(?:light|dark)|data-theme=["\']chakra'),
    _Rule("Emotion",     "CSS Framework", "medium", html=r'data-emotion=|@emotion/'),
    _Rule("Styled Components", "CSS Framework", "medium", html=r'styled-components|data-styled='),

    # ── CMS ───────────────────────────────────────────────────────
    _Rule("WordPress",  "CMS", "high",   html=r'/wp-content/|/wp-includes/|wp-json'),
    _Rule("WordPress",  "CMS", "high",   cookie=r'wordpress_logged_in|wp-settings-', meta=r'wordpress',
          version_re=r'WordPress\s*([\d.]+)'),
    _Rule("WooCommerce","CMS", "high",   html=r'woocommerce|wc-cart-fragments|/plugins/woocommerce/|wc-blocks'),
    _Rule("Drupal",     "CMS", "high",   html=r'Drupal\.settings|/sites/default/files/|drupal\.js'),
    _Rule("Drupal",     "CMS", "high",   header_key="x-drupal-cache", header="", meta=r'drupal'),
    _Rule("Joomla",     "CMS", "high",   html=r'/components/com_|Joomla!|/media/jui/'),
    _Rule("Joomla",     "CMS", "high",   meta=r'joomla', version_re=r'Joomla!\s*([\d.]+)'),
    _Rule("Ghost",      "CMS", "high",   html=r'ghost/core|content="Ghost '),
    _Rule("Ghost",      "CMS", "high",   meta=r'ghost'),
    _Rule("Typo3",      "CMS", "high",   html=r'typo3conf|TYPO3\.settings'),
    _Rule("PrestaShop", "CMS", "high",   html=r'prestashop|PrestaShop'),
    _Rule("Magento",    "CMS", "high",   html=r'Mage\.|/pub/static/frontend/|requirejs/require\.js'),
    _Rule("OpenCart",   "CMS", "medium", html=r'route=common/home|catalog/view/theme'),
    _Rule("Contentful", "CMS", "high",   html=r'contentful\.com|cdn\.contentful\.com'),
    _Rule("Sanity",     "CMS", "high",   html=r'sanity\.io|cdn\.sanity\.io'),
    _Rule("Craft CMS",  "CMS", "medium", cookie=r'CraftSessionId|CRAFT_CSRF_TOKEN'),
    _Rule("Storyblok",  "CMS", "high",   html=r'storyblok\.com|a\.storyblok\.com'),
    _Rule("Prismic",    "CMS", "high",   html=r'prismic\.io|prismic\.cdn'),

    # ── Analytics ─────────────────────────────────────────────────
    _Rule("Google Analytics",       "Analytics", "high",   html=r'google-analytics\.com/|gtag\(|\"UA-'),
    _Rule("Google Analytics",       "Analytics", "medium", cookie=r'_ga|_gid'),
    _Rule("Google Tag Manager",     "Analytics", "high",   html=r'googletagmanager\.com/gtm\.js'),
    _Rule("Hotjar",                 "Analytics", "high",   html=r'hotjar\.com/c/hotjar|static\.hotjar\.com'),
    _Rule("Microsoft Clarity",      "Analytics", "high",   html=r'clarity\.ms/tag|microsoft.*clarity'),
    _Rule("Facebook Pixel",         "Analytics", "high",   html=r'connect\.facebook\.net.*fbevents|fbq\('),
    _Rule("Facebook Pixel",         "Analytics", "medium", cookie=r'_fbp|_fbc'),
    _Rule("Matomo",                 "Analytics", "high",   html=r'matomo\.js|piwik\.js'),
    _Rule("Plausible",              "Analytics", "high",   html=r'plausible\.io/js/'),
    _Rule("Segment",                "Analytics", "high",   html=r'cdn\.segment\.com|analytics\.load\('),
    _Rule("HubSpot",                "Analytics", "high",   html=r'js\.hs-scripts\.com|hs-analytics'),
    _Rule("HubSpot",                "Analytics", "medium", cookie=r'hubspotutk|__hstc'),
    _Rule("Mixpanel",               "Analytics", "high",   html=r'cdn\.mxpanel\.com|mixpanel\.init'),
    _Rule("Amplitude",              "Analytics", "high",   html=r'cdn\.amplitude\.com|amplitude\.getInstance'),
    _Rule("PostHog",                "Analytics", "high",   html=r'posthog\.io|posthog\.js'),
    _Rule("Heap",                   "Analytics", "medium", html=r'heapanalytics\.com|heap\.load'),
    _Rule("Cloudflare Web Analytics","Analytics","high",   html=r'static\.cloudflareinsights\.com'),
    _Rule("Fathom",                 "Analytics", "high",   html=r'cdn\.usefathom\.com'),
    _Rule("TikTok Pixel",           "Analytics", "high",   html=r'analytics\.tiktok\.com'),
    _Rule("Yandex Metrica",         "Analytics", "high",   html=r'mc\.yandex\.ru/metrika|ym\('),
    _Rule("New Relic",              "Analytics", "medium", html=r'newrelic|NREUM'),
    _Rule("Datadog RUM",            "Analytics", "medium", html=r'datadoghq-browser-agent|DD_RUM'),

    # ── Other ─────────────────────────────────────────────────────
    _Rule("Google Fonts", "Other", "high",   html=r'fonts\.googleapis\.com'),
    _Rule("Docusaurus",   "Other", "high",   html=r'__docusaurus|docusaurus(?:\.config)?|theme-doc-|navbar__brand'),
    _Rule("MkDocs",       "Other", "high",   html=r'mkdocs-material|Material for MkDocs|data-md-color-scheme|md-header__button'),
    _Rule("Hugo",         "Other", "high",   meta=r'hugo', version_re=r'Hugo\s*([\d.]+)'),
    _Rule("Sentry",       "Other", "high",   html=r'sentry\.io|@sentry/|Sentry\.init'),
    _Rule("Stripe",       "Other", "high",   html=r'js\.stripe\.com'),
    _Rule("PayPal",       "Other", "high",   html=r'paypal\.com/sdk/js|paypalobjects\.com'),
    _Rule("Razorpay",     "Other", "high",   html=r'checkout\.razorpay\.com'),
    _Rule("Braintree",    "Other", "high",   html=r'braintreegateway\.com|braintree-web'),
    _Rule("reCAPTCHA",    "Other", "high",   html=r'google\.com/recaptcha|grecaptcha'),
    _Rule("Cloudflare Turnstile", "Other", "high", html=r'challenges\.cloudflare\.com/turnstile|cf-turnstile'),
    _Rule("hCaptcha",     "Other", "high",   html=r'hcaptcha\.com'),
    _Rule("Intercom",     "Other", "high",   html=r'widget\.intercom\.io|Intercom\('),
    _Rule("Intercom",     "Other", "medium", cookie=r'intercom-id-|intercom-session-'),
    _Rule("Zendesk",      "Other", "high",   html=r'zendesk\.com/embeddable_framework|zopim'),
    _Rule("Drift",        "Other", "high",   html=r'drift\.com|driftt\.com'),
    _Rule("LiveChat",     "Other", "high",   html=r'cdn\.livechatinc\.com|livechatinc\.com'),
    _Rule("Crisp",        "Other", "high",   html=r'client\.crisp\.chat'),
    _Rule("Tidio",        "Other", "high",   html=r'code\.tidio\.co'),
    _Rule("Webpack",      "Other", "medium", html=r'__webpack_require__|webpackChunk|webpackJsonp'),
    _Rule("Vite",         "Other", "medium", html=r'/@vite/client|vitepress|vite/modulepreload-polyfill|type=["\']module["\'][^>]+/src/'),
    _Rule("Firebase",     "Other", "high",   html=r'firebaseapp\.com|gstatic\.com/firebasejs|firebase\.initializeApp'),
    _Rule("Supabase",     "Database", "medium", html=r'supabase\.co|@supabase/supabase-js'),
    _Rule("Three.js",     "Other", "medium", html=r'three(?:\.module)?(?:\.min)?\.js|THREE\.'),
    _Rule("GSAP",         "Other", "medium", html=r'gsap(?:\.min)?\.js|GreenSock'),
    _Rule("Lodash",       "Other", "medium", html=r'lodash(?:\.min)?\.js|_\.(?:debounce|merge|cloneDeep)'),
    _Rule("Moment.js",    "Other", "medium", html=r'moment(?:\.min)?\.js|moment\.locale'),
    _Rule("Axios",        "Other", "medium", html=r'axios(?:\.min)?\.js|axios\.defaults'),
    _Rule("Socket.IO",    "Other", "medium", html=r'socket\.io(?:\.min)?\.js|/socket\.io/socket\.io\.js'),
]

_IMPLIED_TECH: dict[str, list[tuple[str, TechCategory, TechConfidence]]] = {
    "Next.js": [("React", "JavaScript Framework", "high")],
    "Gatsby": [("React", "JavaScript Framework", "high")],
    "Remix": [("React", "JavaScript Framework", "high")],
    "Nuxt.js": [("Vue.js", "JavaScript Framework", "high")],
    "SvelteKit": [("Svelte", "JavaScript Framework", "high")],
    "WooCommerce": [("WordPress", "CMS", "high")],
}

_CONFIDENCE_RANK: dict[TechConfidence, int] = {
    "low": 1,
    "medium": 2,
    "high": 3,
}

# Display order for categories in the UI
_CATEGORY_ORDER: dict[str, int] = {
    "Web Server": 0, "CDN": 1, "Hosting": 2,
    "Backend Framework": 3, "JavaScript Framework": 4, "CSS Framework": 5,
    "CMS": 6, "Analytics": 7, "Database": 8, "Other": 9,
}


def _detect(
    headers: dict[str, str],
    html: bytes,
    asset_urls: list[str] | None = None,
    asset_texts: list[str] | None = None,
) -> list[TechStackItem]:
    html_text = html.decode("utf-8", errors="replace")
    cookie_text = headers.get("set-cookie", "")
    meta_generator = _extract_meta_generator(html_text)
    asset_url_text = " ".join(asset_urls or [])
    asset_body_text = " ".join(asset_texts or [])
    match_text = " ".join((html_text, asset_url_text, asset_body_text))
    detected: dict[str, TechStackItem] = {}

    for rule in _RULES:
        matched = False
        version: str | None = None
        sources: list[str] = []
        evidence: list[str] = []

        if rule.header_key and rule.header is not None:
            hval = headers.get(rule.header_key.lower(), "")
            if rule.header == "" and hval:
                matched = True
                sources.append("header")
                evidence.append(f"header:{rule.header_key}={_short(hval)}")
            elif rule.header and rule.header.lower() in hval.lower():
                matched = True
                sources.append("header")
                evidence.append(f"header:{rule.header_key}={_short(hval)}")

        if rule.html:
            m = re.search(rule.html, html_text, re.IGNORECASE)
            if m:
                matched = True
                sources.append("html")
                evidence.append(f"html:{_short(m.group(0))}")

            asset_url_match = _first_regex_match(rule.html, asset_urls or [])
            if asset_url_match:
                matched = True
                sources.append("asset-url")
                evidence.append(f"asset-url:{_short(asset_url_match)}")

            asset_body_match = _first_regex_match(rule.html, asset_texts or [])
            if asset_body_match:
                matched = True
                sources.append("asset-body")
                evidence.append(f"asset-body:{_short(asset_body_match)}")

        if not matched and rule.cookie:
            m = re.search(rule.cookie, cookie_text, re.IGNORECASE)
            if m:
                matched = True
                sources.append("cookie")
                evidence.append(f"cookie:{_short(m.group(0))}")

        if not matched and rule.meta and meta_generator:
            m = re.search(rule.meta, meta_generator, re.IGNORECASE)
            if m:
                matched = True
                sources.append("meta")
                evidence.append(f"meta:generator={_short(meta_generator)}")

        if matched:
            if rule.version_re:
                combined = " ".join(headers.values()) + " " + meta_generator + " " + match_text
                vm = re.search(rule.version_re, combined, re.IGNORECASE)
                if vm:
                    version = vm.group(1)

            _upsert_detected(detected, TechStackItem(
                name=rule.name,
                category=rule.category,
                confidence=rule.confidence,
                version=version,
                sources=sources,
                evidence=evidence,
            ))

    _add_implied_tech(detected)
    for name, item in list(detected.items()):
        detected[name] = _calibrate_confidence(item)

    items = list(detected.values())
    items.sort(key=lambda x: (_CATEGORY_ORDER.get(x.category, 99), x.name))
    return items


def _extract_meta_generator(html_text: str) -> str:
    for match in re.finditer(r'<meta\s+[^>]*>', html_text, re.IGNORECASE):
        tag = match.group(0)
        name = _extract_attr(tag, "name")
        if name.lower() != "generator":
            continue
        content = _extract_attr(tag, "content")
        if content:
            return content
    return ""


def _extract_attr(tag: str, attr: str) -> str:
    match = re.search(rf'\b{re.escape(attr)}\s*=\s*(["\'])(.*?)\1', tag, re.IGNORECASE)
    if match:
        return match.group(2)
    unquoted = re.search(rf'\b{re.escape(attr)}\s*=\s*([^\s>]+)', tag, re.IGNORECASE)
    return unquoted.group(1) if unquoted else ""


def _first_regex_match(pattern: str, values: list[str]) -> str | None:
    for value in values:
        match = re.search(pattern, value, re.IGNORECASE)
        if match:
            return value if len(value) < 160 else match.group(0)
    return None


def _short(value: str, limit: int = 96) -> str:
    value = " ".join(value.split())
    return value if len(value) <= limit else f"{value[:limit - 3]}..."


def _calibrate_confidence(item: TechStackItem) -> TechStackItem:
    source_set = set(item.sources)
    if not source_set:
        return _with_confidence(item, "low", "confidence-calibrated: no detection source recorded")

    if source_set <= {"asset-url", "asset-body"}:
        return _downgrade_item(
            item,
            "confidence-calibrated: asset-only signal, capped below direct page/header evidence",
        )

    if source_set == {"inferred"}:
        return _downgrade_item(
            item,
            "confidence-calibrated: inferred from another detected technology",
        )

    if source_set == {"html"} and item.confidence == "medium":
        return _with_confidence(
            item,
            "low",
            "confidence-calibrated: single medium-strength HTML signal",
        )

    return item


def _downgrade_item(item: TechStackItem, note: str) -> TechStackItem:
    if item.confidence == "high":
        return _with_confidence(item, "medium", note)
    if item.confidence == "medium":
        return _with_confidence(item, "low", note)
    return item


def _with_confidence(item: TechStackItem, confidence: TechConfidence, note: str) -> TechStackItem:
    evidence = item.evidence if note in item.evidence else [*item.evidence, note]
    return TechStackItem(
        name=item.name,
        category=item.category,
        confidence=confidence,
        version=item.version,
        sources=item.sources,
        evidence=evidence,
    )


def _extract_asset_urls(base_url: str, html_text: str) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()

    for match in re.finditer(r'<(?:script|link)\s+[^>]*>', html_text, re.IGNORECASE):
        tag = match.group(0)
        raw_url = _extract_attr(tag, "src") or _extract_attr(tag, "href")
        if not raw_url:
            continue

        absolute_url = _normalize_asset_url(base_url, raw_url)
        if not absolute_url or absolute_url in seen:
            continue

        seen.add(absolute_url)
        urls.append(absolute_url)
        if len(urls) >= _MAX_ASSET_CANDIDATES:
            break

    urls.sort(key=_asset_priority)
    return urls[:_MAX_ASSET_CANDIDATES]


def _normalize_asset_url(base_url: str, raw_url: str) -> str | None:
    raw_url = raw_url.strip()
    if not raw_url or raw_url.startswith(("data:", "javascript:", "mailto:", "#")):
        return None

    try:
        absolute_url = urljoin(base_url, raw_url)
        return validate_public_http_url(absolute_url)
    except Exception:
        return None


def _asset_priority(url: str) -> tuple[int, str]:
    lowered = url.lower()
    strong_markers = (
        "/_next/", "/_nuxt/", "/_astro/", "/_app/immutable/", "/wp-content/",
        "asset-manifest", "manifest.json", "mix-manifest", "vite", "shopify",
        "woocommerce", "react", "vue", "angular", "svelte", "webpack",
    )
    likely_runtime = lowered.endswith((".js", ".css", ".json", ".webmanifest"))
    score = 0
    if any(marker in lowered for marker in strong_markers):
        score -= 20
    if likely_runtime:
        score -= 5
    if any(marker in lowered for marker in ("analytics", "gtm", "stripe", "paypal", "sentry")):
        score -= 3
    return score, lowered


def _should_fetch_asset(url: str) -> bool:
    lowered = urlparse(url).path.lower()
    return lowered.endswith((".js", ".css", ".json", ".webmanifest"))


async def _fetch_asset_texts(asset_urls: list[str]) -> list[str]:
    selected = [url for url in asset_urls if _should_fetch_asset(url)][:_MAX_ASSET_FETCHES]
    if not selected:
        return []

    timeout = httpx.Timeout(settings.FETCH_TIMEOUT_SECONDS)
    async with httpx.AsyncClient(
        follow_redirects=False,
        timeout=timeout,
        headers={"User-Agent": _ASSET_USER_AGENT},
    ) as client:
        results = await asyncio.gather(
            *[_fetch_one_asset(client, url) for url in selected],
            return_exceptions=True,
        )
    return [text for text in results if isinstance(text, str) and text]


async def _fetch_one_asset(client: httpx.AsyncClient, url: str) -> str:
    try:
        async with client.stream("GET", url) as response:
            if response.status_code >= 400:
                return ""
            content_type = response.headers.get("content-type", "").lower()
            if content_type and not any(kind in content_type for kind in ("javascript", "json", "css", "text", "ecmascript")):
                return ""

            chunks: list[bytes] = []
            total = 0
            async for chunk in response.aiter_bytes(chunk_size=8192):
                chunks.append(chunk)
                total += len(chunk)
                if total >= _MAX_ASSET_BYTES:
                    break
            return b"".join(chunks).decode("utf-8", errors="replace")
    except Exception:
        return ""


def _upsert_detected(detected: dict[str, TechStackItem], item: TechStackItem) -> None:
    existing = detected.get(item.name)
    if existing is None:
        detected[item.name] = item
        return

    existing_rank = _CONFIDENCE_RANK[existing.confidence]
    item_rank = _CONFIDENCE_RANK[item.confidence]
    sources = _merge_unique(existing.sources, item.sources)
    evidence = _merge_unique(existing.evidence, item.evidence, limit=5)

    if item_rank > existing_rank or (not existing.version and item.version):
        selected = item
    else:
        selected = existing

    detected[item.name] = TechStackItem(
        name=selected.name,
        category=selected.category,
        confidence=selected.confidence,
        version=selected.version or existing.version or item.version,
        sources=sources,
        evidence=evidence,
    )


def _merge_unique(left: list[str], right: list[str], limit: int | None = None) -> list[str]:
    merged: list[str] = []
    for value in left + right:
        if value and value not in merged:
            merged.append(value)
        if limit is not None and len(merged) >= limit:
            break
    return merged


def _add_implied_tech(detected: dict[str, TechStackItem]) -> None:
    for source_name, implied_items in _IMPLIED_TECH.items():
        if source_name not in detected:
            continue
        for name, category, confidence in implied_items:
            _upsert_detected(detected, TechStackItem(
                name=name,
                category=category,
                confidence=confidence,
                sources=["inferred"],
                evidence=[f"inferred:{source_name}"],
            ))


async def analyze_tech_stack(normalized_url: str) -> AnalyzerResult:
    try:
        response, body = await fetch_html(normalized_url)
        headers = {k.lower(): v for k, v in response.headers.items()}
        html_text = body.decode("utf-8", errors="replace")
        asset_urls = _extract_asset_urls(str(response.url), html_text)
        asset_texts = await _fetch_asset_texts(asset_urls)
        items = _detect(headers, body, asset_urls=asset_urls, asset_texts=asset_texts)
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
