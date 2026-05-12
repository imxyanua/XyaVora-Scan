import pytest
from app.utils.normalize_url import normalize_url


def test_bare_domain():
    url, host = normalize_url("example.com")
    assert url == "https://example.com"
    assert host == "example.com"


def test_strips_https_scheme():
    url, host = normalize_url("https://example.com")
    assert url == "https://example.com"
    assert host == "example.com"


def test_strips_http_scheme():
    url, host = normalize_url("http://example.com")
    assert url == "https://example.com"
    assert host == "example.com"


def test_strips_path():
    url, host = normalize_url("https://github.com/some/path?q=1")
    assert url == "https://github.com"
    assert host == "github.com"


def test_strips_whitespace():
    url, host = normalize_url("  google.com  ")
    assert host == "google.com"


def test_subdomain():
    url, host = normalize_url("sub.example.com")
    assert host == "sub.example.com"


def test_no_tld_raises():
    with pytest.raises(ValueError, match="no TLD"):
        normalize_url("localhost")


def test_underscore_in_hostname_raises():
    with pytest.raises(ValueError, match="Invalid hostname"):
        normalize_url("bad_host.com")


def test_empty_raises():
    with pytest.raises(ValueError):
        normalize_url("   ")
