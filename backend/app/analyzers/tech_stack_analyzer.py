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
    header:     str | None = None          # match response header value (case-insensitive)
    header_key: str | None = None          # specific header name to inspect
    html:       str | None = None          # regex against HTML body
    version_re: str | None = None          # capture group 1 = version string


_RULES: list[_Rule] = [
    # ── Web servers ───────────────────────────────────────────────
    _Rule("nginx",          "Web Server",         "high",   header="nginx",         header_key="server"),
    _Rule("Apache",         "Web Server",         "high",   header="apache",        header_key="server"),
    _Rule("Caddy",          "Web Server",         "high",   header="caddy",         header_key="server"),
    _Rule("LiteSpeed",      "Web Server",         "high",   header="litespeed",     header_key="server"),
    _Rule("Microsoft IIS",  "Web Server",         "high",   header="iis",           header_key="server",
          version_re=r"IIS/([\d.]+)"),

    # ── Hosting / CDN / Edge ──────────────────────────────────────
    _Rule("Cloudflare",     "CDN",                "high",   header="cloudflare",    header_key="server"),
    _Rule("Cloudflare",     "CDN",                "high",   header_key="cf-ray",    header=""),
    _Rule("Vercel",         "Hosting",            "high",   header_key="x-vercel-id", header=""),
    _Rule("Netlify",        "Hosting",            "high",   header="netlify",       header_key="server"),
    _Rule("GitHub Pages",   "Hosting",            "high",   header="github.com",    header_key="server"),
    _Rule("AWS CloudFront", "CDN",                "high",   header="cloudfront",    header_key="via"),
    _Rule("Fastly",         "CDN",                "high",   header="fastly",        header_key="via"),

    # ── Backend frameworks / runtimes ─────────────────────────────
    _Rule("PHP",            "Web Server",         "high",   header_key="x-powered-by", header="php",
          version_re=r"PHP/([\d.]+)"),
    _Rule("ASP.NET",        "Web Server",         "high",   header_key="x-powered-by", header="asp.net"),
    _Rule("Express",        "JavaScript Framework","medium", header_key="x-powered-by", header="express"),
    _Rule("Next.js",        "JavaScript Framework","high",   header_key="x-powered-by", header="next.js"),

    # ── JavaScript frameworks (HTML detection) ────────────────────
    _Rule("React",          "JavaScript Framework","high",   html=r'(?:react(?:\.min)?\.js|data-reactroot|__REACT_|/_next/static)'),
    _Rule("Next.js",        "JavaScript Framework","high",   html=r'/_next/static|__NEXT_DATA__'),
    _Rule("Vue.js",         "JavaScript Framework","high",   html=r'vue(?:\.min)?\.js|data-v-app|__vue_app__'),
    _Rule("Angular",        "JavaScript Framework","high",   html=r'(?:angular(?:\.min)?\.js|ng-version=)'),
    _Rule("Nuxt.js",        "JavaScript Framework","high",   html=r'__nuxt__|_nuxt/'),
    _Rule("Svelte",         "JavaScript Framework","medium", html=r'svelte(?:kit)?'),
    _Rule("jQuery",         "JavaScript Framework","high",   html=r'jquery(?:[.-][\d.]+)?(?:\.min)?\.js',
          version_re=r'jquery[.-]([\d.]+)(?:\.min)?\.js'),
    _Rule("Bootstrap",      "CSS Framework",      "high",   html=r'bootstrap(?:\.min)?\.css',
          version_re=r'bootstrap[/@]([\d.]+)'),
    _Rule("Tailwind CSS",   "CSS Framework",      "medium", html=r'tailwind(?:css)?'),

    # ── CMS ───────────────────────────────────────────────────────
    _Rule("WordPress",      "CMS",                "high",   html=r'/wp-content/|/wp-includes/'),
    _Rule("Drupal",         "CMS",                "high",   html=r'Drupal\.settings|/sites/default/files/'),
    _Rule("Joomla",         "CMS",                "high",   html=r'/components/com_|Joomla!'),
    _Rule("Ghost",          "CMS",                "high",   html=r'ghost/core|content="Ghost '),
    _Rule("Shopify",        "Hosting",            "high",   html=r'cdn\.shopify\.com|Shopify\.theme'),
    _Rule("Webflow",        "Hosting",            "high",   html=r'webflow\.com/|data-wf-'),

    # ── Analytics ─────────────────────────────────────────────────
    _Rule("Google Analytics","Analytics",         "high",   html=r'google-analytics\.com/|gtag\('),
    _Rule("Google Tag Manager","Analytics",       "high",   html=r'googletagmanager\.com/gtm\.js'),
    _Rule("Matomo",         "Analytics",          "high",   html=r'matomo\.js|piwik\.js'),
    _Rule("Plausible",      "Analytics",          "high",   html=r'plausible\.io/js/'),
    _Rule("Cloudflare Web Analytics","Analytics", "high",   html=r'static\.cloudflareinsights\.com'),
]


def _detect(
    headers: dict[str, str],
    html: bytes,
) -> list[TechStackItem]:
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
            # header="" means "key present at all"
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
                # Try headers first, then HTML
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

    return items


async def analyze_tech_stack(normalized_url: str) -> AnalyzerResult:
    try:
        response, body = await fetch_html(normalized_url)
        # Build a lowercase header dict for matching
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
