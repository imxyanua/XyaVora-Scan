import re

from app.utils.normalize_url import normalize_url
from app.utils.private_ip_guard import assert_public_hostname

_MAX_LEN = 253  # RFC 1035 hostname limit
_LABEL_RE = re.compile(r"^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$", re.IGNORECASE)

# Short names without a TLD that browsers resolve via local search domains.
# A user typing "internal" could reach a corporate host — block at the name level
# before DNS resolution even happens.
_BLOCKED_LITERALS = {"localhost", "local", "internal", "intranet", "corp"}


def validate_target(raw: str) -> tuple[str, str]:
    """
    Full validation pipeline. Returns (normalized_url, hostname) on success.
    Raises ValueError with a user-facing message on any failure.
    """
    if not raw or not raw.strip():
        raise ValueError("Target must not be empty.")

    if len(raw) > _MAX_LEN + 10:
        raise ValueError("Target is too long.")

    normalized_url, hostname = normalize_url(raw)

    if len(hostname) > _MAX_LEN:
        raise ValueError("Hostname exceeds maximum length.")

    for label in hostname.split("."):
        if not _LABEL_RE.match(label):
            raise ValueError(f"Invalid hostname label: {label!r}")

    if hostname.lower() in _BLOCKED_LITERALS or hostname.lower().endswith(".local"):
        raise ValueError(f"Target {hostname!r} is not allowed.")

    # DNS resolution + private-IP check must come last — it makes a network call.
    assert_public_hostname(hostname)

    return normalized_url, hostname
