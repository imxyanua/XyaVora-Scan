import pytest
from unittest.mock import patch, MagicMock
import ssl
from datetime import datetime, timezone, timedelta

from app.analyzers.ssl_analyzer import analyze_ssl, _parse_cert, _build_findings
from app.schemas.report import SslResult


# ── Helpers ───────────────────────────────────────────────────────

def _future(days: int) -> str:
    dt = datetime.now(timezone.utc) + timedelta(days=days)
    return dt.strftime("%b %d %H:%M:%S %Y GMT")


def _make_info(days_valid: int = 90) -> dict:
    return {
        "cert": {
            "subject": ((("commonName", "example.com"),),),
            "issuer":  ((("organizationName", "Let's Encrypt"),),),
            "notBefore": _future(-10),
            "notAfter":  _future(days_valid),
            "subjectAltName": (("DNS", "example.com"), ("DNS", "www.example.com")),
        },
        "cipher": ("TLS_AES_256_GCM_SHA384", "TLSv1.3", 256),
    }


# ── Unit: _parse_cert ─────────────────────────────────────────────

def test_parse_cert_basic():
    result = _parse_cert("example.com", _make_info(90))
    assert result.httpsAvailable is True
    assert result.trusted is True
    assert result.issuer == "Let's Encrypt"
    assert result.subject == "example.com"
    assert result.protocol == "TLSv1.3"
    assert result.daysRemaining >= 89  # floor division means up to 1 day variance
    assert "example.com" in result.sanDomains


def test_parse_cert_no_warning_when_plenty_of_time():
    result = _parse_cert("example.com", _make_info(60))
    assert result.warning is None


def test_parse_cert_warning_expiring_soon():
    result = _parse_cert("example.com", _make_info(15))
    assert result.warning is not None
    assert "day(s)" in result.warning


def test_parse_cert_san_domains():
    result = _parse_cert("example.com", _make_info(90))
    assert "www.example.com" in result.sanDomains


# ── Unit: _build_findings ─────────────────────────────────────────

def test_findings_valid_cert():
    result = SslResult(
        httpsAvailable=True, trusted=True, daysRemaining=90,
        issuer="X", subject="x.com", validFrom="", validTo="",
        protocol="TLSv1.3",
    )
    findings = _build_findings(result)
    assert len(findings) == 1
    assert findings[0].id == "ssl_valid"
    assert findings[0].status == "pass"


def test_findings_expiring_soon():
    result = SslResult(
        httpsAvailable=True, trusted=True, daysRemaining=10,
        issuer="X", subject="x.com", validFrom="", validTo="2026-05-22T00:00:00+00:00",
        protocol="TLSv1.3",
    )
    findings = _build_findings(result)
    assert findings[0].id == "ssl_expiring_soon"
    assert findings[0].status == "warning"
    assert findings[0].severity == "medium"


def test_findings_expired():
    result = SslResult(
        httpsAvailable=True, trusted=True, daysRemaining=0,
        issuer="X", subject="x.com", validFrom="", validTo="",
    )
    findings = _build_findings(result)
    assert findings[0].id == "ssl_expired"
    assert findings[0].status == "fail"
    assert findings[0].severity == "high"


def test_findings_no_https():
    result = SslResult(httpsAvailable=False)
    findings = _build_findings(result)
    assert findings[0].id == "no_https"
    assert findings[0].status == "fail"
    assert findings[0].severity == "high"


# ── Unit: analyze_ssl with mocked socket ─────────────────────────

@pytest.mark.asyncio
async def test_analyze_ssl_success():
    with patch("app.analyzers.ssl_analyzer.asyncio.to_thread", return_value=_make_info(90)):
        result = await analyze_ssl("example.com")

    assert result.status == "success"
    assert result.data.httpsAvailable is True
    assert result.data.daysRemaining >= 89
    assert result.data.protocol == "TLSv1.3"
    assert result.findings[0].id == "ssl_valid"


@pytest.mark.asyncio
async def test_analyze_ssl_connection_refused():
    with patch(
        "app.analyzers.ssl_analyzer.asyncio.to_thread",
        side_effect=ConnectionRefusedError("Connection refused"),
    ):
        result = await analyze_ssl("example.com")

    assert result.status == "success"
    assert result.data.httpsAvailable is False
    assert result.findings[0].id == "no_https"


@pytest.mark.asyncio
async def test_analyze_ssl_cert_verification_failed():
    with patch(
        "app.analyzers.ssl_analyzer.asyncio.to_thread",
        side_effect=ssl.SSLCertVerificationError("cert verify failed"),
    ):
        result = await analyze_ssl("example.com")

    assert result.status == "success"
    assert result.data.trusted is False
    assert result.data.httpsAvailable is True


# ── Integration: real TLS ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_analyze_ssl_github_real():
    result = await analyze_ssl("github.com")
    assert result.status == "success"
    assert result.data.httpsAvailable is True
    assert result.data.trusted is True
    assert result.data.daysRemaining > 0
    assert result.data.protocol is not None
