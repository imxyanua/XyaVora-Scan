import re

from app.utils.normalize_url import normalize_url
from app.utils.private_ip_guard import assert_public_hostname


_MAX_LEN = 253
_LABEL_RE = re.compile(r"^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$", re.IGNORECASE)


def validate_target(raw: str) -> tuple[str, str]:
    """
    Full validation pipeline. Returns (normalized_url, hostname) on success.
    Raises ValueError with a user-facing message on failure.
    """
    if not raw or not raw.strip():
        raise ValueError("Target must not be empty.")

    if len(raw) > _MAX_LEN + 10:
        raise ValueError("Target is too long.")

    normalized_url, hostname = normalize_url(raw)

    if len(hostname) > _MAX_LEN:
        raise ValueError("Hostname exceeds maximum length.")

    labels = hostname.split(".")
    for label in labels:
        if not _LABEL_RE.match(label):
            raise ValueError(f"Invalid hostname label: {label!r}")

    # Block known bad literals before DNS resolution
    _blocked_literals = {"localhost", "local", "internal", "intranet", "corp"}
    if hostname.lower() in _blocked_literals or hostname.lower().endswith(".local"):
        raise ValueError(f"Target {hostname!r} is not allowed.")

    # SSRF: resolve and check IPs
    assert_public_hostname(hostname)

    return normalized_url, hostname
