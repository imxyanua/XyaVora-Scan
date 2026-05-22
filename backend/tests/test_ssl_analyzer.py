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
    assert result.cipherName == "TLS_AES_256_GCM_SHA384"
    assert result.cipherBits == 256
    assert result.tlsConfidence == "high"
    assert "protocol: TLSv1.3" in result.certificateEvidence
    assert "cipher: TLS_AES_256_GCM_SHA384" in result.certificateEvidence
    assert "validity_parse_status: ok" in result.certificateEvidence
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
    assert findings[0].classification == "informational"


def test_findings_expiring_soon():
    result = SslResult(
        httpsAvailable=True, trusted=True, daysRemaining=10,
        issuer="X", subject="x.com", validFrom="",
        validTo=(datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        protocol="TLSv1.3",
    )
    findings = _build_findings(result)
    assert findings[0].id == "ssl_expiring_soon"
    assert findings[0].status == "warning"
    assert findings[0].severity == "medium"
    assert findings[0].classification == "observed-risk"


def test_findings_less_than_one_day_remaining_is_not_expired():
    valid_to = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    result = SslResult(
        httpsAvailable=True, trusted=True, daysRemaining=0,
        issuer="X", subject="x.com", validFrom="", validTo=valid_to,
        protocol="TLSv1.3",
    )
    findings = _build_findings(result)
    assert findings[0].id == "ssl_expiring_soon"
    assert "ssl_expired" not in {finding.id for finding in findings}


def test_findings_expired():
    result = SslResult(
        httpsAvailable=True, trusted=True, daysRemaining=0,
        issuer="X", subject="x.com", validFrom="",
        validTo=(datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
    )
    findings = _build_findings(result)
    assert findings[0].id == "ssl_expired"
    assert findings[0].status == "fail"
    assert findings[0].severity == "high"
    assert findings[0].classification == "verified-issue"


def test_findings_no_https():
    result = SslResult(httpsAvailable=False)
    findings = _build_findings(result)
    assert findings[0].id == "no_https"
    assert findings[0].status == "fail"
    assert findings[0].severity == "high"
    assert findings[0].classification == "observed-risk"


def test_findings_untrusted_cert_not_reported_as_expired():
    result = SslResult(
        httpsAvailable=True,
        trusted=False,
        tlsConfidence="medium",
        certificateEvidence=["certificate verification failed"],
    )
    findings = _build_findings(result)

    assert findings[0].id == "ssl_untrusted"
    assert findings[0].status == "fail"
    assert findings[0].classification == "verified-issue"
    assert "ssl_expired" not in {finding.id for finding in findings}


def test_findings_legacy_tls_and_weak_cipher():
    result = SslResult(
        httpsAvailable=True,
        trusted=True,
        daysRemaining=90,
        issuer="X",
        subject="x.com",
        validFrom="",
        validTo="",
        protocol="TLSv1",
        cipherBits=64,
        certificateEvidence=["protocol: TLSv1", "cipher: OLD"],
    )
    findings = _build_findings(result)
    ids = {finding.id for finding in findings}

    assert "tls_legacy_protocol" in ids
    assert "tls_weak_cipher" in ids
    assert next(f for f in findings if f.id == "tls_legacy_protocol").classification == "verified-issue"
    assert next(f for f in findings if f.id == "tls_weak_cipher").classification == "verified-issue"


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
    assert result.data.tlsConfidence == "medium"
    assert result.data.certificateEvidence
    assert result.findings[0].id == "ssl_untrusted"


# ── Integration: real TLS ─────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.integration
async def test_analyze_ssl_github_real():
    result = await analyze_ssl("github.com")
    assert result.status == "success"
    assert result.data.httpsAvailable is True
    assert result.data.trusted is True
    assert result.data.daysRemaining > 0
    assert result.data.protocol is not None
