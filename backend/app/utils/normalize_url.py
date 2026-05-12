import re
from urllib.parse import urlparse


def normalize_url(target: str) -> tuple[str, str]:
    """
    Returns (normalized_url, hostname).
    Strips scheme/path noise, forces https://.
    Raises ValueError if target looks malformed.
    """
    target = target.strip()

    # Strip leading scheme if present
    if re.match(r"^https?://", target, re.IGNORECASE):
        parsed = urlparse(target)
        hostname = parsed.hostname or ""
    else:
        parsed = urlparse(f"https://{target}")
        hostname = parsed.hostname or ""

    if not hostname:
        raise ValueError(f"Cannot parse hostname from: {target!r}")

    # Reject obviously bad hostnames
    if not re.match(r"^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$", hostname, re.IGNORECASE):
        raise ValueError(f"Invalid hostname: {hostname!r}")

    if "." not in hostname:
        raise ValueError(f"Hostname has no TLD: {hostname!r}")

    normalized_url = f"https://{hostname}"
    return normalized_url, hostname
