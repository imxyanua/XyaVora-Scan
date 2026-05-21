import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.analyzers.dns_analyzer import (
    analyze_dns,
    _build_findings,
    _detect_dmarc,
    _detect_spf,
    _email_security_confidence,
    _parse_dmarc,
    _parse_spf,
    _record_evidence,
)
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


def test_parse_spf_extracts_all_policy_and_lookup_count():
    parsed = _parse_spf("v=spf1 include:_spf.example.com mx a -all")
    assert parsed["spfAll"] == "-"
    assert parsed["spfLookupCount"] == 3


def test_detect_dmarc_found():
    records = [_txt("v=DMARC1; p=reject; rua=mailto:dmarc@example.com")]
    found, val = _detect_dmarc(records)
    assert found is True
    assert val is not None and "p=reject" in val


def test_detect_dmarc_not_found():
    found, val = _detect_dmarc([])
    assert found is False


def test_parse_dmarc_extracts_policy_tags():
    parsed = _parse_dmarc("v=DMARC1; p=quarantine; sp=reject; pct=50; rua=mailto:d@example.com; adkim=s; aspf=r")
    assert parsed["dmarcPolicy"] == "quarantine"
    assert parsed["dmarcSubdomainPolicy"] == "reject"
    assert parsed["dmarcPct"] == 50
    assert parsed["dmarcRua"] == "mailto:d@example.com"
    assert parsed["dmarcAlignmentDkim"] == "s"
    assert parsed["dmarcAlignmentSpf"] == "r"


def test_record_evidence_includes_host_type_and_value():
    records = [DnsRecord(type="MX", host="example.com", value="10 mail.example.com", ttl=300)]
    assert _record_evidence(records) == ["example.com MX 10 mail.example.com ttl=300"]


def test_email_security_confidence_high_requires_strict_spf_and_enforced_dmarc():
    result = DnsResult(
        mxDetected=True,
        spfDetected=True,
        dmarcDetected=True,
        spfAll="-",
        dmarcPolicy="reject",
    )
    assert _email_security_confidence(result) == "high"


def test_email_security_confidence_medium_when_records_exist_but_not_enforced():
    result = DnsResult(
        mxDetected=True,
        spfDetected=True,
        dmarcDetected=True,
        spfAll="~",
        dmarcPolicy="none",
    )
    assert _email_security_confidence(result) == "medium"


def test_build_findings_missing_both():
    result = DnsResult(spfDetected=False, dmarcDetected=False)
    findings = _build_findings(result, None, "example.com")
    ids = [f.id for f in findings]
    assert "missing_spf" in ids
    assert "missing_dmarc" in ids
    assert all(f.status == "fail" for f in findings)
    spf = next(f for f in findings if f.id == "missing_spf")
    dmarc = next(f for f in findings if f.id == "missing_dmarc")
    assert "dig TXT example.com" in spf.verification
    assert "dig TXT _dmarc.example.com" in dmarc.verification


def test_build_findings_dmarc_none_policy():
    result = DnsResult(spfDetected=True, dmarcDetected=True, dmarcPolicy="none")
    findings = _build_findings(result, "v=DMARC1; p=none", "example.com")
    ids = [f.id for f in findings]
    assert "dmarc_not_strict" in ids
    assert findings[0].status == "warning"
    finding = next(f for f in findings if f.id == "dmarc_not_strict")
    assert "p= tag is set to none" in finding.analysis
    assert "dig TXT _dmarc.example.com" in finding.verification


def test_build_findings_all_good():
    result = DnsResult(spfDetected=True, dmarcDetected=True, spfAll="-", dmarcPolicy="reject")
    findings = _build_findings(result, "v=DMARC1; p=reject")
    assert findings == []


def test_build_findings_warns_on_weak_spf_all():
    result = DnsResult(spfDetected=True, dmarcDetected=True, spfAll="+", dmarcPolicy="reject")
    findings = _build_findings(result, "v=DMARC1; p=reject")
    assert "spf_weak_all_policy" in [f.id for f in findings]


def test_build_findings_warns_on_partial_dmarc_pct():
    result = DnsResult(spfDetected=True, dmarcDetected=True, spfAll="-", dmarcPolicy="reject", dmarcPct=50)
    findings = _build_findings(result, "v=DMARC1; p=reject; pct=50")
    assert "dmarc_partial_enforcement" in [f.id for f in findings]


def test_build_findings_warns_on_multiple_spf_records():
    result = DnsResult(
        spfDetected=True,
        dmarcDetected=True,
        spfRecordCount=2,
        dmarcRecordCount=1,
        spfAll="-",
        dmarcPolicy="reject",
        spfEvidence=[
            "example.com TXT v=spf1 include:_spf.one -all ttl=300",
            "example.com TXT v=spf1 include:_spf.two -all ttl=300",
        ],
    )
    findings = _build_findings(result, "v=DMARC1; p=reject")
    finding = next(f for f in findings if f.id == "spf_multiple_records")

    assert finding.status == "fail"
    assert finding.confidence == "verified"
    assert len(finding.evidence) == 2


def test_build_findings_warns_on_multiple_dmarc_records():
    result = DnsResult(
        spfDetected=True,
        dmarcDetected=True,
        spfRecordCount=1,
        dmarcRecordCount=2,
        spfAll="-",
        dmarcPolicy="reject",
        dmarcEvidence=[
            "_dmarc.example.com TXT v=DMARC1; p=reject ttl=300",
            "_dmarc.example.com TXT v=DMARC1; p=quarantine ttl=300",
        ],
    )
    findings = _build_findings(result, "v=DMARC1; p=reject")

    assert "dmarc_multiple_records" in [f.id for f in findings]


def test_build_findings_warns_on_invalid_dmarc_policy():
    result = DnsResult(spfDetected=True, dmarcDetected=True, spfAll="-", dmarcPolicy="bad")
    findings = _build_findings(result, "v=DMARC1; p=bad")

    assert "dmarc_invalid_policy" in [f.id for f in findings]


# ── Integration tests — real DNS (requires network) ───────────────

@pytest.mark.asyncio
@pytest.mark.integration
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
