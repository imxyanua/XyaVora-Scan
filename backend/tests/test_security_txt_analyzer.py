import pytest
from unittest.mock import patch, AsyncMock, MagicMock

import httpx

from app.analyzers.security_txt_analyzer import (
    analyze_security_txt, _parse_security_txt, _build_findings, _expires_is_expired,
)
from app.schemas.report import SecurityTxtResult


# ── Unit: _parse_security_txt ─────────────────────────────────────

def test_parse_full():
    text = """
# security.txt
Contact: mailto:security@example.com
Policy: https://example.com/security-policy
Encryption: https://example.com/pgp.asc
Expires: 2027-01-01T00:00:00Z
"""
    fields = _parse_security_txt(text)
    assert fields["contact"]    == "mailto:security@example.com"
    assert fields["policy"]     == "https://example.com/security-policy"
    assert fields["encryption"] == "https://example.com/pgp.asc"
    assert fields["expires"]    == "2027-01-01T00:00:00Z"


def test_parse_comments_ignored():
    text = "# Contact: attacker@evil.com\nContact: mailto:real@example.com\n"
    fields = _parse_security_txt(text)
    assert fields["contact"] == "mailto:real@example.com"


def test_parse_only_first_contact():
    text = "Contact: mailto:first@example.com\nContact: mailto:second@example.com\n"
    fields = _parse_security_txt(text)
    assert fields["contact"] == "mailto:first@example.com"


def test_parse_empty():
    fields = _parse_security_txt("")
    assert fields["contact"] is None


def test_expires_is_expired():
    assert _expires_is_expired("2000-01-01T00:00:00Z") is True
    assert _expires_is_expired("2999-01-01T00:00:00Z") is False
    assert _expires_is_expired(None) is False


# ── Unit: _build_findings ─────────────────────────────────────────

def test_findings_not_present():
    result = SecurityTxtResult(present=False)
    findings = _build_findings(result)
    assert findings[0].id == "no_security_txt"
    assert findings[0].status == "warning"


def test_findings_present_with_contact():
    result = SecurityTxtResult(
        present=True,
        location="https://example.com/.well-known/security.txt",
        contact="mailto:sec@example.com",
        expires="2999-01-01T00:00:00Z",
    )
    findings = _build_findings(result)
    assert any(f.id == "security_txt_present" for f in findings)
    assert not any(f.id == "security_txt_no_contact" for f in findings)
    assert not any(f.id == "security_txt_no_expires" for f in findings)


def test_findings_present_without_contact():
    result = SecurityTxtResult(
        present=True,
        location="https://example.com/.well-known/security.txt",
        contact=None,
    )
    findings = _build_findings(result)
    assert any(f.id == "security_txt_present" for f in findings)
    assert any(f.id == "security_txt_no_contact" for f in findings)


# ── Integration: analyze_security_txt with mock ───────────────────

def test_findings_present_missing_or_expired_expires():
    missing = SecurityTxtResult(
        present=True,
        location="https://example.com/.well-known/security.txt",
        contact="mailto:sec@example.com",
    )
    expired = SecurityTxtResult(
        present=True,
        location="https://example.com/.well-known/security.txt",
        contact="mailto:sec@example.com",
        expires="2000-01-01T00:00:00Z",
        expired=True,
    )

    missing_findings = _build_findings(missing)
    expired_findings = _build_findings(expired)

    assert any(f.id == "security_txt_no_expires" for f in missing_findings)
    assert any(f.id == "security_txt_expired" for f in expired_findings)


def _ok_response(body: str) -> MagicMock:
    r = MagicMock(spec=httpx.Response)
    r.status_code = 200
    r.text = body
    return r


def _not_found() -> MagicMock:
    r = MagicMock(spec=httpx.Response)
    r.status_code = 404
    r.text = ""
    return r


@pytest.mark.asyncio
async def test_analyze_finds_well_known():
    txt = "Contact: mailto:sec@example.com\nExpires: 2027-01-01T00:00:00Z\n"

    async def fake_get(url, **kwargs):
        if ".well-known" in url:
            return _ok_response(txt)
        return _not_found()

    with patch("app.analyzers.security_txt_analyzer.httpx.AsyncClient") as MockClient:
        instance = AsyncMock()
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        instance.get = fake_get
        MockClient.return_value = instance

        result = await analyze_security_txt("https://example.com")

    assert result.status == "success"
    assert result.data.present is True
    assert result.data.contact == "mailto:sec@example.com"
    assert result.data.checkedLocations == ["https://example.com/.well-known/security.txt"]
    assert result.data.expired is False
    assert "contact: mailto:sec@example.com" in result.data.securityTxtEvidence
    assert any(f.id == "security_txt_present" for f in result.findings)


@pytest.mark.asyncio
async def test_analyze_not_found():
    async def fake_get(url, **kwargs):
        return _not_found()

    with patch("app.analyzers.security_txt_analyzer.httpx.AsyncClient") as MockClient:
        instance = AsyncMock()
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        instance.get = fake_get
        MockClient.return_value = instance

        result = await analyze_security_txt("https://example.com")

    assert result.status == "success"
    assert result.data.present is False
    assert result.data.checkedLocations == [
        "https://example.com/.well-known/security.txt",
        "https://example.com/security.txt",
    ]
    assert result.findings[0].id == "no_security_txt"


@pytest.mark.asyncio
async def test_analyze_timeout_falls_through():
    """Timeouts on all paths should still return not-found (not error)."""
    async def fake_get(url, **kwargs):
        raise httpx.TimeoutException("timeout")

    with patch("app.analyzers.security_txt_analyzer.httpx.AsyncClient") as MockClient:
        instance = AsyncMock()
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        instance.get = fake_get
        MockClient.return_value = instance

        result = await analyze_security_txt("https://example.com")

    assert result.status == "success"
    assert result.data.present is False
