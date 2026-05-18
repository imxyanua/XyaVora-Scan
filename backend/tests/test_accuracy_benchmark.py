from datetime import datetime, timezone, timedelta

import httpx

from app.analyzers.dns_analyzer import _email_security_confidence
from app.analyzers.headers_analyzer import _check_headers
from app.analyzers.http_overview_analyzer import _detect_cdn
from app.analyzers.ssl_analyzer import _parse_cert
from app.analyzers.tech_stack_analyzer import _detect, _extract_asset_urls
from app.schemas.report import DnsResult


def _names(items):
    return {item.name for item in items}


def _future(days: int) -> str:
    dt = datetime.now(timezone.utc) + timedelta(days=days)
    return dt.strftime("%b %d %H:%M:%S %Y GMT")


def test_accuracy_benchmark_next_vercel_cloudflare_signals_are_explained():
    html = """
    <html>
      <head>
        <script id="__NEXT_DATA__" type="application/json">{}</script>
        <script src="/_next/static/chunks/app/page.js"></script>
      </head>
    </html>
    """
    asset_urls = _extract_asset_urls("https://example.com", html)
    headers = {
        "x-vercel-id": "sin1::abc123",
        "cf-ray": "abc123-SIN",
        "server": "cloudflare",
    }

    items = _detect(headers, html.encode(), asset_urls=asset_urls)
    names = _names(items)
    provider, confidence, evidence = _detect_cdn(httpx.Headers(headers))

    assert {"Next.js", "React", "Vercel", "Cloudflare"} <= names
    assert "WordPress" not in names
    assert "Shopify" not in names

    nextjs = next(item for item in items if item.name == "Next.js")
    vercel = next(item for item in items if item.name == "Vercel")
    cloudflare = next(item for item in items if item.name == "Cloudflare")

    assert {"html", "asset-url"} <= set(nextjs.sources)
    assert "header" in vercel.sources
    assert "header" in cloudflare.sources
    assert nextjs.evidence
    assert vercel.evidence
    assert cloudflare.evidence

    assert provider == "Cloudflare"
    assert confidence == "high"
    assert any("cf-ray" in item for item in evidence)


def test_accuracy_benchmark_wordpress_woocommerce_email_and_clean_headers():
    html = """
    <html>
      <head><meta name="generator" content="WordPress 6.5.4"></head>
      <body>
        <script src="/wp-content/plugins/woocommerce/assets/js/frontend/cart-fragments.js"></script>
      </body>
    </html>
    """
    items = _detect({}, html.encode())
    names = _names(items)

    dns_result = DnsResult(
        mxDetected=True,
        spfDetected=True,
        dmarcDetected=True,
        spfAll="-",
        dmarcPolicy="reject",
    )
    security_items, findings = _check_headers(httpx.Headers({
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "content-security-policy": "default-src 'self'; object-src 'none'",
        "x-frame-options": "DENY",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
        "permissions-policy": "geolocation=(), camera=(), microphone=()",
    }))

    assert {"WordPress", "WooCommerce"} <= names
    assert "Shopify" not in names
    assert _email_security_confidence(dns_result) == "high"
    assert all(item.status == "present" for item in security_items)
    assert findings == []


def test_accuracy_benchmark_permissive_headers_are_not_marked_clean():
    security_items, findings = _check_headers(httpx.Headers({
        "strict-transport-security": "max-age=300",
        "content-security-policy": "default-src * 'unsafe-inline'",
        "x-frame-options": "ALLOWALL",
        "x-content-type-options": "text/html",
        "referrer-policy": "unsafe-url",
        "permissions-policy": "geolocation=()",
    }))

    statuses = {item.header: item.status for item in security_items}
    finding_ids = {finding.id for finding in findings}

    assert statuses["Strict-Transport-Security"] == "warning"
    assert statuses["Content-Security-Policy"] == "warning"
    assert statuses["X-Frame-Options"] == "warning"
    assert statuses["X-Content-Type-Options"] == "warning"
    assert statuses["Referrer-Policy"] == "warning"
    assert {
        "weak_hsts",
        "weak_csp",
        "weak_x_frame",
        "weak_xcto",
        "weak_referrer_policy",
    } <= finding_ids


def test_accuracy_benchmark_tls_result_has_connection_evidence():
    result = _parse_cert("example.com", {
        "cert": {
            "subject": ((("commonName", "example.com"),),),
            "issuer": ((("organizationName", "Let's Encrypt"),),),
            "notBefore": _future(-3),
            "notAfter": _future(90),
            "subjectAltName": (("DNS", "example.com"), ("DNS", "www.example.com")),
        },
        "cipher": ("TLS_AES_256_GCM_SHA384", "TLSv1.3", 256),
    })

    assert result.httpsAvailable is True
    assert result.trusted is True
    assert result.tlsConfidence == "high"
    assert result.protocol == "TLSv1.3"
    assert result.cipherName == "TLS_AES_256_GCM_SHA384"
    assert result.cipherBits == 256
    assert "protocol: TLSv1.3" in result.certificateEvidence
    assert "cipher: TLS_AES_256_GCM_SHA384" in result.certificateEvidence
    assert "san_count: 2" in result.certificateEvidence


def test_accuracy_benchmark_negative_heuristics_avoid_common_false_positives():
    html = """
    <html>
      <body>
        Reactive content with reaction icons.
        A generic sessionid cookie belongs to many frameworks.
        <script src="/swagger-ui-bundle.js"></script>
        <a href="/docs/oauth2-redirect">OAuth redirect</a>
        <div class="flex grid text-red-500">Utility-like class names only.</div>
      </body>
    </html>
    """
    items = _detect({"set-cookie": "sessionid=abc; Path=/; HttpOnly"}, html.encode())
    names = _names(items)

    assert "Swagger UI" in names
    assert "React" not in names
    assert "Django" not in names
    assert "FastAPI" not in names
    assert "Tailwind CSS" not in names
