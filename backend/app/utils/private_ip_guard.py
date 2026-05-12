import ipaddress
import socket


# All private / reserved ranges that must be blocked
_BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),   # link-local / AWS metadata
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("198.51.100.0/24"),  # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),   # TEST-NET-3
    ipaddress.ip_network("224.0.0.0/4"),      # multicast
    ipaddress.ip_network("240.0.0.0/4"),      # reserved
    ipaddress.ip_network("::1/128"),           # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),          # IPv6 ULA
    ipaddress.ip_network("fe80::/10"),         # IPv6 link-local
]


def _is_private(ip_str: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip_str)
        return any(addr in net for net in _BLOCKED_NETWORKS)
    except ValueError:
        return True  # unparseable → block


def assert_public_hostname(hostname: str) -> None:
    """
    Resolves hostname to IPs and raises ValueError if any resolved
    IP is private, loopback, or reserved.
    """
    # Block bare IP inputs that are private
    try:
        addr = ipaddress.ip_address(hostname)
        if _is_private(str(addr)):
            raise ValueError(f"Target resolves to a private/reserved address: {hostname}")
        return
    except ValueError as exc:
        if "private" in str(exc) or "reserved" in str(exc):
            raise

    # Resolve DNS
    try:
        results = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise ValueError(f"DNS resolution failed for {hostname!r}: {exc}") from exc

    for family, _type, _proto, _canonname, sockaddr in results:
        ip = sockaddr[0]
        if _is_private(ip):
            raise ValueError(
                f"Target {hostname!r} resolves to private/reserved IP: {ip}"
            )
