import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from app.analyzers.headers_analyzer import analyze_headers, _check_headers, _server_finding


# ── Helpers ───────────────────────────────────────────────────────

def _make_headers(pairs: dict[str, str]) -> httpx.Headers:
    return httpx.Headers(pairs)


def _mock_response(headers: dict[str, str], status: int = 200, url: str = "https://example.com") -> MagicMock:
    r = MagicMock()
    r.headers = _make_headers(headers)
    r.status_code = status
    r.url = httpx.URL(url)
    return r


# ── Unit: _check_headers ──────────────────────────────────────────

def test_all_headers_present():
    raw = _make_headers({
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "content-security-policy":   "default-src 'self'",
        "x-frame-options":           "DENY",
        "x-content-type-options":    "nosniff",
        "referrer-policy":           "strict-origin-when-cross-origin",
        "permissions-policy":        "geolocation=()",
    })
    items, findings = _check_headers(raw)
    assert all(i.status == "present" for i in items)
    assert findings == []
    hsts = next(i for i in items if i.header == "Strict-Transport-Security")
    assert hsts.confidence == "high"
    assert hsts.evidence == ["Strict-Transport-Security: max-age=31536000; includeSubDomains"]


def test_all_headers_missing():
    items, findings = _check_headers(_make_headers({}))
    assert all(i.status == "missing" for i in items)
    assert len(findings) == 6
    hsts = next(i for i in items if i.header == "Strict-Transport-Security")
    assert hsts.confidence == "high"
    assert hsts.evidence == ["Strict-Transport-Security: not present in response headers"]


def test_missing_hsts_produces_best_practice_warning():
    items, findings = _check_headers(_make_headers({}))
    hsts_finding = next(f for f in findings if f.id == "missing_hsts")
    assert hsts_finding.status == "warning"
    assert hsts_finding.severity == "medium"
    assert hsts_finding.confidence == "best-practice"


def test_missing_referrer_produces_warning():
    items, findings = _check_headers(_make_headers({}))
    ref_finding = next(f for f in findings if f.id == "missing_referrer")
    assert ref_finding.status == "warning"
    assert ref_finding.severity == "low"


def test_partial_headers():
    raw = _make_headers({
        "strict-transport-security": "max-age=31536000",
        "x-content-type-options": "nosniff",
    })
    items, findings = _check_headers(raw)
    present = {i.header for i in items if i.status == "present"}
    missing_findings = {f.id for f in findings}
    assert "Strict-Transport-Security" in present
    assert "X-Content-Type-Options" in present
    assert "missing_csp" in missing_findings
    assert "missing_hsts" not in missing_findings


def test_weak_hsts_produces_warning_item_and_finding():
    raw = _make_headers({
        "strict-transport-security": "max-age=300",
    })
    items, findings = _check_headers(raw)
    hsts = next(i for i in items if i.header == "Strict-Transport-Security")

    assert hsts.status == "warning"
    assert hsts.confidence == "medium"
    assert "weak_hsts" in {f.id for f in findings}


def test_permissive_csp_produces_warning_item_and_finding():
    raw = _make_headers({
        "content-security-policy": "default-src * 'unsafe-inline'",
    })
    items, findings = _check_headers(raw)
    csp = next(i for i in items if i.header == "Content-Security-Policy")

    assert csp.status == "warning"
    assert csp.confidence == "medium"
    assert "weak_csp" in {f.id for f in findings}


def test_server_finding():
    finding = _server_finding("nginx/1.18.0")
    assert finding.id == "server_exposed"
    assert finding.status == "info"
    assert finding.severity == "info"
    assert "nginx/1.18.0" in finding.description


# ── Unit: analyze_headers with mocked fetch ───────────────────────

@pytest.mark.asyncio
async def test_analyze_headers_no_security_headers():
    mock_resp = _mock_response({"server": "Apache"})
    with patch("app.analyzers.headers_analyzer.fetch_headers_only", return_value=mock_resp):
        result = await analyze_headers("https://example.com")

    assert result.status == "success"
    assert result.data.statusCode == 200
    assert result.data.server == "Apache"
    # All 6 security headers missing + server exposed = 7 findings
    finding_ids = {f.id for f in result.findings}
    assert "missing_hsts" in finding_ids
    assert "missing_csp" in finding_ids
    assert "server_exposed" in finding_ids


@pytest.mark.asyncio
async def test_analyze_headers_timeout():
    with patch(
        "app.analyzers.headers_analyzer.fetch_headers_only",
        side_effect=httpx.TimeoutException("timed out"),
    ):
        result = await analyze_headers("https://example.com")

    assert result.status == "error"
    assert len(result.errors) > 0
    assert "timed out" in result.errors[0]


@pytest.mark.asyncio
async def test_analyze_headers_request_error():
    with patch(
        "app.analyzers.headers_analyzer.fetch_headers_only",
        side_effect=httpx.ConnectError("connection refused"),
    ):
        result = await analyze_headers("https://example.com")

    assert result.status == "error"


@pytest.mark.asyncio
async def test_analyze_headers_redirect_detected():
    mock_resp = _mock_response(
        headers={},
        url="https://www.example.com/",  # different from input
    )
    with patch("app.analyzers.headers_analyzer.fetch_headers_only", return_value=mock_resp):
        result = await analyze_headers("https://example.com")

    assert result.data.redirectDetected is True
    assert result.data.finalUrl == "https://www.example.com/"


@pytest.mark.asyncio
async def test_analyze_headers_no_redirect():
    mock_resp = _mock_response(headers={}, url="https://example.com")
    with patch("app.analyzers.headers_analyzer.fetch_headers_only", return_value=mock_resp):
        result = await analyze_headers("https://example.com")

    assert result.data.redirectDetected is False


# ── Integration: real network ─────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.integration
async def test_analyze_headers_cloudflare_real():
    # Cloudflare reliably returns HSTS and other security headers
    result = await analyze_headers("https://cloudflare.com")
    assert result.status == "success"
    assert result.data.statusCode in (200, 301, 302, 307, 308)
    assert isinstance(result.data.securityHeaders, list)
    assert len(result.data.securityHeaders) == 6
