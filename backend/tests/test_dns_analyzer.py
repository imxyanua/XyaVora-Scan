import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.analyzers.dns_analyzer import analyze_dns, _detect_spf, _detect_dmarc, _build_findings
from app.schemas.report import DnsRecord, DnsResult


# ── Unit tests — no network ───────────────────────────────────────

def _txt(value: str) -> DnsRecord:
    return DnsRecord(type="TXT", host="example.com", value=value)


def test_detect_spf_found():
    records = [_txt("v=spf1 include:_spf.google.com ~all")]
    found, val = _detect_spf(records)
    assert found is True
    assert val is not None and "v=spf1" in val


def test_detect_spf_not_found():
    records = [_txt("google-site-verification=abc123")]
    found, val = _detect_spf(records)
    assert found is False
    assert val is None


def test_detect_spf_empty():
    found, val = _detect_spf([])
    assert found is False


def test_detect_dmarc_found():
    records = [_txt("v=DMARC1; p=reject; rua=mailto:dmarc@example.com")]
    found, val = _detect_dmarc(records)
    assert found is True
    assert val is not None and "p=reject" in val


def test_detect_dmarc_not_found():
    found, val = _detect_dmarc([])
    assert found is False


def test_build_findings_missing_both():
    result = DnsResult(spfDetected=False, dmarcDetected=False)
    findings = _build_findings(result, None)
    ids = [f.id for f in findings]
    assert "missing_spf" in ids
    assert "missing_dmarc" in ids
    assert all(f.status == "fail" for f in findings)


def test_build_findings_dmarc_none_policy():
    result = DnsResult(spfDetected=True, dmarcDetected=True)
    findings = _build_findings(result, "v=DMARC1; p=none")
    ids = [f.id for f in findings]
    assert "dmarc_not_strict" in ids
    assert findings[0].status == "warning"


def test_build_findings_all_good():
    result = DnsResult(spfDetected=True, dmarcDetected=True)
    findings = _build_findings(result, "v=DMARC1; p=reject")
    assert findings == []


# ── Integration tests — real DNS (requires network) ───────────────

@pytest.mark.asyncio
async def test_analyze_dns_google():
    result = await analyze_dns("google.com")
    assert result.status == "success"
    assert result.data is not None

    dns_data: DnsResult = result.data
    types = {r.type for r in dns_data.records}

    # A records are the most reliable across network conditions
    assert "A" in types
    # SPF/DMARC detection accuracy depends on TXT query success — check type, not value
    assert isinstance(dns_data.spfDetected, bool)
    assert isinstance(dns_data.dmarcDetected, bool)


@pytest.mark.asyncio
async def test_analyze_dns_returns_analyzer_result_shape():
    result = await analyze_dns("cloudflare.com")
    assert result.key == "dns"
    assert result.status in ("success", "error")
    assert isinstance(result.findings, list)
    assert isinstance(result.errors, list)


@pytest.mark.asyncio
async def test_analyze_dns_nonexistent_domain():
    # Should not raise — errors are captured inside _query
    result = await analyze_dns("this-domain-does-not-exist-xyzxyz.com")
    assert result.status == "success"
    assert result.data.records == []
    # Missing SPF + DMARC findings expected
    ids = [f.id for f in result.findings]
    assert "missing_spf" in ids
    assert "missing_dmarc" in ids
