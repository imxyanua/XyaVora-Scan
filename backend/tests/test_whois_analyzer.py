import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta

from app.analyzers.whois_analyzer import analyze_whois, _parse_whois, _build_findings, _to_iso
from app.schemas.report import WhoisResult


# ── Helpers ───────────────────────────────────────────────────────

def _future_dt(days: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


def _mock_whois(days_until_expiry: int = 365, dnssec: str = "unsigned") -> MagicMock:
    m = MagicMock()
    m.get = lambda key, default=None: {
        "registrar":       "GoDaddy.com, LLC",
        "creation_date":   _future_dt(-1000),
        "updated_date":    _future_dt(-30),
        "expiration_date": _future_dt(days_until_expiry),
        "name_servers":    ["ns1.example.com", "ns2.example.com"],
        "dnssec":          dnssec,
    }.get(key, default)
    return m


# ── Unit: _to_iso ─────────────────────────────────────────────────

def test_to_iso_none():
    assert _to_iso(None) is None


def test_to_iso_datetime():
    dt = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert _to_iso(dt) == "2026-01-01T00:00:00+00:00"


def test_to_iso_list_of_datetimes():
    dt1 = datetime(2026, 1, 1, tzinfo=timezone.utc)
    dt2 = datetime(2027, 1, 1, tzinfo=timezone.utc)
    assert _to_iso([dt1, dt2]) == "2026-01-01T00:00:00+00:00"


def test_to_iso_naive_datetime():
    dt = datetime(2026, 1, 1)  # no tzinfo
    result = _to_iso(dt)
    assert "2026-01-01" in result


# ── Unit: _parse_whois ────────────────────────────────────────────

def test_parse_whois_basic():
    result = _parse_whois(_mock_whois(365))
    assert result.registrar == "GoDaddy.com, LLC"
    assert result.expiryDate is not None
    assert "ns1.example.com" in result.nameServers
    assert result.error is None


def test_parse_whois_deduplicates_nameservers():
    m = MagicMock()
    m.get = lambda key, default=None: {
        "name_servers": ["NS1.EXAMPLE.COM", "ns1.example.com", "ns2.example.com"],
        "registrar": "Test",
    }.get(key, default)
    result = _parse_whois(m)
    assert result.nameServers.count("ns1.example.com") == 1


# ── Unit: _build_findings ─────────────────────────────────────────

def test_findings_registration_ok():
    result = WhoisResult(expiryDate=(_future_dt(365)).isoformat(), dnssec="signedDelegation")
    findings = _build_findings(result)
    ids = [f.id for f in findings]
    assert "domain_registration_ok" in ids
    assert "dnssec_enabled" in ids


def test_findings_expiring_soon():
    result = WhoisResult(expiryDate=(_future_dt(20)).isoformat(), dnssec="unsigned")
    findings = _build_findings(result)
    expiring = next(f for f in findings if f.id == "domain_expiring_soon")
    assert expiring.status == "warning"
    assert expiring.severity == "medium"


def test_findings_expired():
    result = WhoisResult(expiryDate=(_future_dt(-5)).isoformat(), dnssec="unsigned")
    findings = _build_findings(result)
    expired = next(f for f in findings if f.id == "domain_expired")
    assert expired.status == "fail"
    assert expired.severity == "high"


def test_findings_dnssec_not_enabled():
    result = WhoisResult(expiryDate=(_future_dt(365)).isoformat(), dnssec="unsigned")
    findings = _build_findings(result)
    dnssec_f = next(f for f in findings if f.id == "dnssec_not_enabled")
    assert dnssec_f.status == "warning"


def test_findings_error():
    result = WhoisResult(error="Query rate limit exceeded")
    findings = _build_findings(result)
    assert findings[0].id == "whois_unavailable"
    assert findings[0].status == "info"


# ── Integration: analyze_whois with mock ─────────────────────────

@pytest.mark.asyncio
async def test_analyze_whois_success():
    with patch("app.analyzers.whois_analyzer.asyncio.to_thread", return_value=_mock_whois(365)):
        result = await analyze_whois("example.com")

    assert result.status == "success"
    assert result.data.registrar == "GoDaddy.com, LLC"
    assert any(f.id == "domain_registration_ok" for f in result.findings)


@pytest.mark.asyncio
async def test_analyze_whois_exception():
    with patch(
        "app.analyzers.whois_analyzer.asyncio.to_thread",
        side_effect=Exception("Network error"),
    ):
        result = await analyze_whois("example.com")

    assert result.status == "success"
    assert result.data.error is not None
    assert result.findings[0].id == "whois_unavailable"


# ── Integration: real whois ───────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.integration
async def test_analyze_whois_github_real():
    result = await analyze_whois("github.com")
    assert result.status == "success"
    assert result.data.registrar is not None
    assert result.data.expiryDate is not None
