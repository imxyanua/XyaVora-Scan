import dns.asyncresolver
import dns.exception
import httpx

from app.core.config import settings
from app.schemas.analyzer import AnalyzerResult
from app.schemas.report import ServerLocationResult

_USER_AGENT = "XyaVora-Scan/0.1 (passive-security-scanner; server-location)"
_GEO_ENDPOINT = "https://ipwho.is"
_COUNTRY_LANGUAGES = {
    "AU": ["English"],
    "BR": ["Portuguese"],
    "CA": ["English", "French"],
    "CN": ["Chinese"],
    "DE": ["German"],
    "ES": ["Spanish"],
    "FR": ["French"],
    "GB": ["English"],
    "IN": ["Hindi", "English"],
    "JP": ["Japanese"],
    "KR": ["Korean"],
    "NL": ["Dutch"],
    "RU": ["Russian"],
    "SG": ["English"],
    "US": ["English"],
    "VN": ["Vietnamese"],
}


async def _resolve_ip(hostname: str) -> str | None:
    resolver = dns.asyncresolver.Resolver()
    resolver.timeout = 2
    resolver.lifetime = 3

    for rtype in ("A", "AAAA"):
        try:
            answers = await resolver.resolve(hostname, rtype)
        except (dns.exception.DNSException, Exception):
            continue
        for answer in answers:
            value = answer.to_text().rstrip(".")
            if value:
                return value
    return None


def _evidence(result: ServerLocationResult) -> list[str]:
    evidence = []
    for label, value in (
        ("ip", result.ip),
        ("city", result.city),
        ("region", result.region),
        ("country", result.country),
        ("timezone", result.timezone),
        ("coordinates", f"{result.latitude},{result.longitude}" if result.latitude is not None and result.longitude is not None else None),
        ("asn", result.asn),
        ("organization", result.organization),
        ("source", result.source),
    ):
        if value is not None:
            evidence.append(f"{label}: {value}")
    return evidence


def _parse_location_response(data: dict, ip: str) -> ServerLocationResult:
    if data.get("success") is False:
        return ServerLocationResult(
            ip=ip,
            source=_GEO_ENDPOINT,
            error=str(data.get("message") or "IP geolocation lookup failed"),
        )

    timezone = data.get("timezone")
    currency = data.get("currency")
    connection = data.get("connection")
    country_code = data.get("country_code")

    result = ServerLocationResult(
        ip=str(data.get("ip") or ip),
        city=data.get("city") or None,
        region=data.get("region") or None,
        postal=data.get("postal") or None,
        country=data.get("country") or None,
        countryCode=country_code or None,
        timezone=timezone.get("id") if isinstance(timezone, dict) else None,
        languages=_COUNTRY_LANGUAGES.get(str(country_code or "").upper(), []),
        currency=currency.get("name") if isinstance(currency, dict) else None,
        currencyCode=currency.get("code") if isinstance(currency, dict) else None,
        latitude=data.get("latitude") if isinstance(data.get("latitude"), (int, float)) else None,
        longitude=data.get("longitude") if isinstance(data.get("longitude"), (int, float)) else None,
        organization=connection.get("org") if isinstance(connection, dict) else None,
        isp=connection.get("isp") if isinstance(connection, dict) else None,
        asn=connection.get("asn") if isinstance(connection, dict) and isinstance(connection.get("asn"), int) else None,
        source=_GEO_ENDPOINT,
    )
    result.locationEvidence = _evidence(result)
    return result


async def analyze_server_location(hostname: str) -> AnalyzerResult:
    ip = await _resolve_ip(hostname)
    if not ip:
        result = ServerLocationResult(error="Could not resolve a public IP address for geolocation.")
        return AnalyzerResult(key="serverLocation", status="success", data=result, findings=[])

    timeout = httpx.Timeout(min(settings.FETCH_TIMEOUT_SECONDS, 5))
    try:
        async with httpx.AsyncClient(timeout=timeout, headers={"User-Agent": _USER_AGENT}) as client:
            response = await client.get(f"{_GEO_ENDPOINT}/{ip}")
            response.raise_for_status()
            result = _parse_location_response(response.json(), ip)
    except (httpx.TimeoutException, httpx.RequestError, ValueError) as exc:
        result = ServerLocationResult(
            ip=ip,
            source=_GEO_ENDPOINT,
            error=f"IP geolocation lookup failed: {exc}",
        )
    return AnalyzerResult(key="serverLocation", status="success", data=result, findings=[])
