import pytest
from app.utils.private_ip_guard import assert_public_hostname


def test_public_ip_passes():
    # 8.8.8.8 is Google DNS — reliably public
    assert_public_hostname("8.8.8.8")


def test_loopback_blocked():
    with pytest.raises(ValueError, match="private/reserved"):
        assert_public_hostname("127.0.0.1")


def test_private_class_a_blocked():
    with pytest.raises(ValueError, match="private/reserved"):
        assert_public_hostname("10.0.0.1")


def test_private_class_b_blocked():
    with pytest.raises(ValueError, match="private/reserved"):
        assert_public_hostname("172.16.0.1")


def test_private_class_c_blocked():
    with pytest.raises(ValueError, match="private/reserved"):
        assert_public_hostname("192.168.1.100")


def test_metadata_endpoint_blocked():
    # AWS/GCP/Azure instance metadata — primary SSRF target
    with pytest.raises(ValueError, match="private/reserved"):
        assert_public_hostname("169.254.169.254")


def test_ipv6_loopback_blocked():
    with pytest.raises(ValueError, match="private/reserved"):
        assert_public_hostname("::1")


def test_public_domain_passes():
    # Requires network — skipped in offline environments
    assert_public_hostname("google.com")
