import pytest
from unittest.mock import patch, MagicMock

import httpx

from app.analyzers.cookies_analyzer import (
    analyze_cookies, _parse_set_cookie, _build_findings,
)
from app.schemas.report import CookieResult


# ── Unit: _parse_set_cookie ───────────────────────────────────────

def test_parse_all_secure_flags():
    c = _parse_set_cookie("session=abc; Secure; HttpOnly; SameSite=Lax; Max-Age=3600")
    assert c.name == "session"
    assert c.secure is True
    assert c.httpOnly is True
    assert c.sameSite == "Lax"
    assert c.maxAge == 3600
    assert c.warnings == []
    assert "cookie: session" in c.evidence
    assert "secure: True" in c.evidence
    assert "max_age: 3600" in c.evidence


def test_parse_missing_secure():
    c = _parse_set_cookie("token=xyz; HttpOnly; SameSite=Strict")
    assert c.secure is False
    assert any("Secure" in w for w in c.warnings)
    assert any(item.startswith("warning:") for item in c.evidence)


def test_parse_missing_httponly():
    c = _parse_set_cookie("pref=dark; Secure; SameSite=Lax")
    assert c.httpOnly is False
    assert any("HttpOnly" in w for w in c.warnings)


def test_parse_missing_samesite():
    c = _parse_set_cookie("uid=1; Secure; HttpOnly")
    assert c.sameSite is None
    assert any("SameSite" in w for w in c.warnings)


def test_parse_samesite_none_without_secure():
    c = _parse_set_cookie("x=1; SameSite=None")
    assert any("SameSite=None" in w for w in c.warnings)


def test_parse_expires():
    c = _parse_set_cookie("x=1; Secure; HttpOnly; SameSite=Lax; Expires=Wed, 01 Jan 2026 00:00:00 GMT")
    assert c.expires is not None


def test_parse_name_with_equals_in_value():
    c = _parse_set_cookie("token=abc==; Secure; HttpOnly; SameSite=Strict")
    assert c.name == "token"


# ── Unit: _build_findings ─────────────────────────────────────────

def test_findings_no_cookies():
    findings = _build_findings([])
    assert findings[0].id == "no_cookies"
    assert findings[0].status == "info"
    assert findings[0].classification == "informational"


def test_findings_all_ok():
    c = CookieResult(name="s", secure=True, httpOnly=True, sameSite="Lax")
    findings = _build_findings([c])
    assert any(f.id == "cookies_ok" for f in findings)
    assert next(f for f in findings if f.id == "cookies_ok").classification == "informational"


def test_findings_missing_secure():
    c = CookieResult(name="bad", secure=False, httpOnly=True, sameSite="Lax")
    findings = _build_findings([c])
    finding = next(f for f in findings if f.id == "cookie_no_secure")
    assert finding.status == "warning"
    assert finding.classification == "observed-risk"
    assert "cookie: bad" in finding.evidence
    assert "secure: False" in finding.evidence


def test_findings_missing_httponly():
    c = CookieResult(name="bad", secure=True, httpOnly=False, sameSite="Lax")
    findings = _build_findings([c])
    finding = next(f for f in findings if f.id == "cookie_no_httponly")
    assert finding.status == "warning"
    assert finding.classification == "observed-risk"
    assert "not proof that a session token is exposed" in finding.analysis


def test_findings_missing_samesite():
    c = CookieResult(name="bad", secure=True, httpOnly=True, sameSite=None)
    findings = _build_findings([c])
    finding = next(f for f in findings if f.id == "cookie_no_samesite")
    assert finding.classification == "hardening-recommendation"


# ── Integration: analyze_cookies with mock ────────────────────────

def _fake_response(set_cookie_values: list[str]) -> MagicMock:
    r = MagicMock(spec=httpx.Response)
    r.headers = MagicMock()
    r.headers.get_list = MagicMock(return_value=set_cookie_values)
    return r


@pytest.mark.asyncio
async def test_analyze_cookies_secure_cookie():
    raw = ["session=abc; Secure; HttpOnly; SameSite=Lax"]
    with patch("app.analyzers.cookies_analyzer.fetch_headers_only", return_value=_fake_response(raw)):
        result = await analyze_cookies("https://example.com")

    assert result.status == "success"
    assert result.data[0].secure is True
    assert any(f.id == "cookies_ok" for f in result.findings)


@pytest.mark.asyncio
async def test_analyze_cookies_insecure_cookie():
    raw = ["track=abc"]
    with patch("app.analyzers.cookies_analyzer.fetch_headers_only", return_value=_fake_response(raw)):
        result = await analyze_cookies("https://example.com")

    assert result.status == "success"
    finding_ids = [f.id for f in result.findings]
    assert "cookie_no_secure" in finding_ids
    assert "cookie_no_httponly" in finding_ids


@pytest.mark.asyncio
async def test_analyze_cookies_timeout():
    with patch(
        "app.analyzers.cookies_analyzer.fetch_headers_only",
        side_effect=httpx.TimeoutException("timeout"),
    ):
        result = await analyze_cookies("https://example.com")

    assert result.status == "error"
    assert result.errors
