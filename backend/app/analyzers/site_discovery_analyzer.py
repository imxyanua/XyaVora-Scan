import xml.etree.ElementTree as ET
from urllib.parse import urljoin

import httpx

from app.core.config import settings
from app.schemas.analyzer import AnalyzerResult
from app.schemas.report import Finding, SiteDiscoveryResult
from app.utils.safe_fetch import validate_public_http_url

_USER_AGENT = "XyaVora-Scan/0.1 (passive-security-scanner; site-discovery)"
_MAX_TEXT_BYTES = 256_000
_REDIRECT_STATUSES = {301, 302, 303, 307, 308}
_MAX_REDIRECTS = 5
_MAX_SITEMAP_CANDIDATES = 6
_MAX_DISPLAY_URLS = 12


async def _fetch_text(client: httpx.AsyncClient, url: str) -> tuple[int, str, str]:
    current_url = validate_public_http_url(url)

    for _ in range(_MAX_REDIRECTS + 1):
        async with client.stream("GET", current_url) as response:
            location = response.headers.get("location")
            if response.status_code in _REDIRECT_STATUSES and location:
                current_url = validate_public_http_url(urljoin(str(response.url), location))
                continue

            chunks: list[bytes] = []
            total = 0
            async for chunk in response.aiter_bytes(chunk_size=8192):
                chunks.append(chunk)
                total += len(chunk)
                if total >= _MAX_TEXT_BYTES:
                    break
            body = b"".join(chunks)
            return response.status_code, str(response.url), body.decode("utf-8", errors="replace")

    raise httpx.TooManyRedirects(f"Exceeded redirect limit for {url}")


def _append_unique(values: list[str], value: str, limit: int = _MAX_DISPLAY_URLS) -> None:
    value = value.strip()
    if value and value not in values and len(values) < limit:
        values.append(value)


def parse_robots_txt(text: str) -> dict:
    user_agents: list[str] = []
    allow_rules: list[str] = []
    disallow_rules: list[str] = []
    sitemap_urls: list[str] = []
    crawl_delay: str | None = None
    active_agents: list[str] = []
    disallow_all = False

    for raw_line in text.splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue

        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()

        if key == "user-agent":
            active_agents = [value.lower()]
            _append_unique(user_agents, value)
        elif key == "allow":
            _append_unique(allow_rules, value)
        elif key == "disallow":
            _append_unique(disallow_rules, value)
            if "*" in active_agents and value == "/":
                disallow_all = True
        elif key == "crawl-delay" and crawl_delay is None:
            crawl_delay = value
        elif key == "sitemap":
            _append_unique(sitemap_urls, value)

    return {
        "userAgents": user_agents,
        "allowRules": allow_rules,
        "disallowRules": disallow_rules,
        "sitemapUrls": sitemap_urls,
        "crawlDelay": crawl_delay,
        "disallowAll": disallow_all,
    }


def parse_sitemap_xml(text: str) -> tuple[int, int, list[str]]:
    try:
        root = ET.fromstring(text.encode("utf-8"))
    except ET.ParseError:
        return 0, 0, []

    url_count = 0
    sitemap_count = 0
    locations: list[str] = []

    for elem in root.iter():
        tag = elem.tag.rsplit("}", 1)[-1].lower()
        if tag == "url":
            url_count += 1
        elif tag == "sitemap":
            sitemap_count += 1
        elif tag == "loc" and elem.text:
            _append_unique(locations, elem.text)

    return url_count, sitemap_count, locations


def _text_evidence(label: str, requested_url: str, status: int, final_url: str, text: str) -> list[str]:
    return [
        f"{label}.requested_url: {requested_url}",
        f"{label}.status_code: {status}",
        f"{label}.final_url: {final_url}",
        f"{label}.bytes_read: {len(text.encode('utf-8'))}",
    ]


def _build_findings(result: SiteDiscoveryResult) -> list[Finding]:
    findings: list[Finding] = []

    findings.append(Finding(
        id="robots_txt_present" if result.robotsPresent else "robots_txt_missing",
        severity="info",
        category="Discovery",
        title="robots.txt Found" if result.robotsPresent else "robots.txt Not Found",
        description=(
            f"robots.txt was found at {result.robotsUrl}."
            if result.robotsPresent
            else "No robots.txt file was found at the site root."
        ),
        recommendation=(
            "Review crawl rules periodically so search engines and scanners receive the intended guidance."
            if result.robotsPresent
            else "Publish a robots.txt file if the site needs explicit crawler guidance or sitemap discovery."
        ),
        status="pass" if result.robotsPresent else "info",
        confidence="observed",
        source="http",
        evidence=result.robotsEvidence,
    ))

    findings.append(Finding(
        id="sitemap_present" if result.sitemapPresent else "sitemap_missing",
        severity="info",
        category="Discovery",
        title="Sitemap Found" if result.sitemapPresent else "Sitemap Not Found",
        description=(
            f"Found sitemap data with {result.sitemapUrlCount} URL entries and {result.sitemapIndexCount} nested sitemaps."
            if result.sitemapPresent
            else "No sitemap was found from robots.txt or /sitemap.xml."
        ),
        recommendation=(
            "Keep sitemap URLs current so crawlers can discover important pages reliably."
            if result.sitemapPresent
            else "Add a sitemap.xml and reference it from robots.txt for better page discovery."
        ),
        status="pass" if result.sitemapPresent else "info",
        confidence="observed",
        source="http",
        evidence=result.sitemapEvidence,
    ))

    if result.disallowAll:
        findings.append(Finding(
            id="robots_disallow_all",
            severity="low",
            category="Discovery",
            title="robots.txt Blocks All Crawlers",
            description="robots.txt contains a global 'Disallow: /' rule for User-agent: *.",
            impact="Search engines and benign crawlers may avoid indexing the site.",
            recommendation="Confirm this is intentional. If not, narrow the disallow rules to specific paths.",
            status="warning",
            confidence="observed",
            source="http",
            evidence=result.robotsEvidence,
        ))

    return findings


async def analyze_site_discovery(normalized_url: str) -> AnalyzerResult:
    result = SiteDiscoveryResult()
    robots_url = normalized_url.rstrip("/") + "/robots.txt"
    sitemap_candidates = [normalized_url.rstrip("/") + "/sitemap.xml"]
    timeout = httpx.Timeout(settings.FETCH_TIMEOUT_SECONDS)

    try:
        async with httpx.AsyncClient(
            follow_redirects=False,
            timeout=timeout,
            headers={"User-Agent": _USER_AGENT},
        ) as client:
            try:
                robots_status, final_robots_url, robots_text = await _fetch_text(client, robots_url)
                result.robotsStatusCode = robots_status
                result.robotsEvidence = _text_evidence("robots", robots_url, robots_status, final_robots_url, robots_text)
                result.discoveryEvidence.extend(result.robotsEvidence)
                if robots_status == 200 and robots_text.strip():
                    parsed = parse_robots_txt(robots_text)
                    result.robotsPresent = True
                    result.robotsUrl = final_robots_url
                    result.userAgents = parsed["userAgents"]
                    result.allowRules = parsed["allowRules"]
                    result.disallowRules = parsed["disallowRules"]
                    result.crawlDelay = parsed["crawlDelay"]
                    result.disallowAll = parsed["disallowAll"]

                    for sitemap_url in parsed["sitemapUrls"]:
                        try:
                            absolute_sitemap_url = validate_public_http_url(urljoin(final_robots_url, sitemap_url))
                            _append_unique(sitemap_candidates, absolute_sitemap_url, _MAX_SITEMAP_CANDIDATES)
                        except Exception:
                            continue
            except Exception:
                # robots.txt is optional; still try /sitemap.xml before returning.
                pass

            for sitemap_url in sitemap_candidates[:_MAX_SITEMAP_CANDIDATES]:
                try:
                    status, final_sitemap_url, sitemap_text = await _fetch_text(client, sitemap_url)
                except Exception:
                    continue
                sitemap_evidence = _text_evidence("sitemap", sitemap_url, status, final_sitemap_url, sitemap_text)
                result.discoveryEvidence.extend(sitemap_evidence)
                if status != 200 or not sitemap_text.strip():
                    continue
                url_count, sitemap_count, locations = parse_sitemap_xml(sitemap_text)
                if url_count == 0 and sitemap_count == 0 and not locations:
                    continue

                result.sitemapPresent = True
                result.sitemapUrl = final_sitemap_url
                result.sitemapUrlCount = url_count
                result.sitemapIndexCount = sitemap_count
                result.sitemapUrls = locations
                result.sitemapEvidence = [
                    *sitemap_evidence,
                    f"sitemap.url_count: {url_count}",
                    f"sitemap.index_count: {sitemap_count}",
                    *[f"sitemap.loc: {url}" for url in locations[:6]],
                ]
                break

        return AnalyzerResult(
            key="siteDiscovery",
            status="success",
            data=result,
            findings=_build_findings(result),
        )
    except Exception as exc:
        result.error = str(exc)
        return AnalyzerResult(
            key="siteDiscovery",
            status="error",
            data=result,
            findings=[],
            errors=[str(exc)],
        )
