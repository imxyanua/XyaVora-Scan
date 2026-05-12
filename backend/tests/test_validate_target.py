import pytest
from app.utils.validate_target import validate_target


# ── Valid inputs ──────────────────────────────────────────────────

def test_valid_domain():
    url, host = validate_target("github.com")
    assert host == "github.com"
    assert url == "https://github.com"


def test_valid_with_https():
    url, host = validate_target("https://cloudflare.com")
    assert host == "cloudflare.com"


def test_valid_subdomain():
    # sub.example.com does not resolve — use a real subdomain
    url, host = validate_target("docs.github.com")
    assert host == "docs.github.com"


def test_strips_path():
    url, host = validate_target("https://example.com/page?q=1")
    assert host == "example.com"


# ── Blocked inputs ────────────────────────────────────────────────

def test_empty_raises():
    with pytest.raises(ValueError, match="empty"):
        validate_target("")


def test_whitespace_raises():
    with pytest.raises(ValueError, match="empty"):
        validate_target("   ")


def test_private_ip_blocked():
    with pytest.raises(ValueError):
        validate_target("192.168.0.1")


def test_loopback_blocked():
    with pytest.raises(ValueError):
        validate_target("127.0.0.1")


def test_metadata_blocked():
    with pytest.raises(ValueError):
        validate_target("169.254.169.254")


def test_localhost_blocked():
    # "localhost" has no TLD — caught by normalize_url before SSRF check
    with pytest.raises(ValueError):
        validate_target("localhost")


def test_blocked_literal_internal():
    # "internal" has no TLD so normalize_url rejects it before the blocked-literal check
    with pytest.raises(ValueError):
        validate_target("internal")


def test_dot_local_blocked():
    with pytest.raises(ValueError, match="not allowed"):
        validate_target("myhost.local")


def test_underscore_label_blocked():
    with pytest.raises(ValueError, match="Invalid hostname"):
        validate_target("bad_host.com")


def test_too_long_blocked():
    with pytest.raises(ValueError):
        validate_target("a" * 300)
