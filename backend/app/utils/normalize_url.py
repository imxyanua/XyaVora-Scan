import re
from urllib.parse import unquote, urlparse


def normalize_url(target: str) -> tuple[str, str]:
    """
    Returns (normalized_url, hostname).
    Always produces https:// — we never scan plain HTTP targets because
    the SSL analyzer needs to verify HTTPS availability independently.
    """
    target = unquote(target.strip())

    if re.match(r"^https?://", target, re.IGNORECASE):
        parsed = urlparse(target)
        hostname = parsed.hostname or ""
    else:
        parsed = urlparse(f"https://{target}")
        hostname = parsed.hostname or ""

    if not hostname:
        raise ValueError(f"Cannot parse hostname from: {target!r}")

    # Reject chars that are valid in URLs but not in hostnames (e.g. underscore).
    # RFC 1123 allows only a-z, 0-9, hyphen, dot.
    if not re.match(r"^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$", hostname, re.IGNORECASE):
        raise ValueError(f"Invalid hostname: {hostname!r}")

    if "." not in hostname:
        raise ValueError(f"Hostname has no TLD: {hostname!r}")

    return f"https://{hostname}", hostname
