import asyncio
import time
from datetime import datetime, timezone
from typing import Literal

from app.core.config import settings
from app.schemas.report import (
    ScanReport, DnsResult, SslResult, HeadersResult, Finding,
    HttpOverviewResult, PageMetadataResult, SiteDiscoveryResult,
    WhoisResult, SecurityTxtResult, ScreenshotResult, EvidenceSummaryItem,
    ServerLocationResult,
)
from app.schemas.analyzer import AnalyzerResult
from app.analyzers.dns_analyzer         import analyze_dns
from app.analyzers.ssl_analyzer         import analyze_ssl
from app.analyzers.headers_analyzer     import analyze_headers
from app.analyzers.http_overview_analyzer import analyze_http_overview
from app.analyzers.server_location_analyzer import analyze_server_location
from app.analyzers.page_metadata_analyzer import analyze_page_metadata
from app.analyzers.site_discovery_analyzer import analyze_site_discovery
from app.analyzers.whois_analyzer       import analyze_whois
from app.analyzers.tech_stack_analyzer  import analyze_tech_stack
from app.analyzers.cookies_analyzer     import analyze_cookies
from app.analyzers.security_txt_analyzer import analyze_security_txt
from app.analyzers.screenshot_analyzer  import analyze_screenshot
from app.analyzers.score_analyzer       import analyze_score

# In-memory TTL cache: hostname -> (ScanReport, expiry_timestamp)
# Short TTL — only deduplicates concurrent requests within the same scan operation.
# Intentional rescans (after a few seconds) always get fresh data.
_SCAN_CACHE: dict[str, tuple["ScanReport", float]] = {}
_CACHE_TTL = 5.0  # seconds

_STATUS_PRIORITY = {
    "fail": 0,
    "warning": 1,
    "info": 2,
    "pass": 3,
}

_SEVERITY_PRIORITY = {
    "high": 0,
    "medium": 1,
    "low": 2,
    "info": 3,
}

_CONFIDENCE_PRIORITY = {
    "verified": 0,
    "observed": 1,
    "best-practice": 2,
    "inferred": 3,
}

EvidenceLevelValue = Literal["verified", "observed", "inferred", "unavailable", "error"]
EvidenceConfidenceValue = Literal["high", "medium", "low"]


def _merge_unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    merged: list[str] = []

    for value in values:
        if value in seen:
            continue
        seen.add(value)
        merged.append(value)

    return merged


def _merge_finding_evidence(primary: Finding, secondary: Finding) -> Finding:
    merged = primary.model_copy(deep=True)
    merged.evidence = _merge_unique([*primary.evidence, *secondary.evidence])

    if _CONFIDENCE_PRIORITY[secondary.confidence] < _CONFIDENCE_PRIORITY[merged.confidence]:
        merged.confidence = secondary.confidence
        merged.source = secondary.source

    return merged


def is_cached(hostname: str) -> bool:
    entry = _SCAN_CACHE.get(hostname)
    return bool(entry and time.monotonic() < entry[1])


def _cache_get(hostname: str) -> "ScanReport | None":
    entry = _SCAN_CACHE.get(hostname)
    if entry and time.monotonic() < entry[1]:
        return entry[0]
    _SCAN_CACHE.pop(hostname, None)
    return None


def _cache_set(hostname: str, report: "ScanReport") -> None:
    _SCAN_CACHE[hostname] = (report, time.monotonic() + _CACHE_TTL)


def normalize_findings(findings: list[Finding]) -> list[Finding]:
    """
    Produces a stable, reader-friendly finding list for report display and scoring.
    Analyzer modules can emit findings independently, so this step removes exact
    duplicates and places actionable issues before informational/pass findings.
    """
    deduped: dict[tuple[str, str, str], Finding] = {}

    for finding in findings:
        key = (finding.id, finding.category, finding.status)
        existing = deduped.get(key)
        if existing is None:
            deduped[key] = finding.model_copy(deep=True)
            continue

        existing_rank = (_STATUS_PRIORITY[existing.status], _SEVERITY_PRIORITY[existing.severity])
        candidate_rank = (_STATUS_PRIORITY[finding.status], _SEVERITY_PRIORITY[finding.severity])
        if candidate_rank < existing_rank:
            deduped[key] = _merge_finding_evidence(finding, existing)
        else:
            deduped[key] = _merge_finding_evidence(existing, finding)

    return sorted(
        deduped.values(),
        key=lambda finding: (
            _STATUS_PRIORITY[finding.status],
            _SEVERITY_PRIORITY[finding.severity],
            finding.category,
            finding.title.lower(),
        ),
    )


def _tech_is_asset_only(sources: list[str]) -> bool:
    return bool(sources) and all(source in {"asset-url", "asset-body"} for source in sources)


def annotate_server_location_network_context(
    location: ServerLocationResult,
    http_overview: HttpOverviewResult,
) -> ServerLocationResult:
    """
    Adds HTTP-observed CDN context to IP geolocation without claiming origin
    server placement. IP geolocation describes the resolved address only.
    """
    if location.error or not location.ip or not http_overview.cdnProvider:
        return location

    updated = location.model_copy(deep=True)
    provider = http_overview.cdnProvider
    evidence = [
        f"http_cdn_provider: {provider}",
        *[f"http_cdn_evidence: {item}" for item in http_overview.cdnEvidence],
    ]

    updated.networkProvider = updated.networkProvider or provider
    updated.networkRole = "edge-or-proxy"
    updated.locationConfidence = "low"
    updated.accuracyNote = (
        f"HTTP response indicates {provider}; location likely describes a CDN/edge node, "
        "not a verified origin server."
    )
    updated.networkEvidence = _merge_unique([*updated.networkEvidence, *evidence])
    updated.locationEvidence = _merge_unique([
        *updated.locationEvidence,
        f"network_role: {updated.networkRole}",
        f"network_provider: {updated.networkProvider}",
        f"accuracy_note: {updated.accuracyNote}",
        *evidence,
    ])
    return updated


def build_evidence_summary(report: ScanReport) -> list[EvidenceSummaryItem]:
    """
    Summarizes how reliable each major report module is.
    This gives API clients an explicit evidence model instead of forcing the UI
    to infer whether data came from direct protocol checks, page observation, or
    lower-confidence heuristics.
    """
    items: list[EvidenceSummaryItem] = []

    def add(
        module: str,
        label: str,
        level: EvidenceLevelValue,
        detail: str,
        source: str,
        confidence: EvidenceConfidenceValue | None = None,
        evidence: list[str] | None = None,
    ) -> None:
        items.append(EvidenceSummaryItem(
            module=module,
            label=label,
            level=level,
            detail=detail,
            source=source,
            confidence=confidence,
            evidence=evidence or [],
        ))

    if report.dns.error:
        add("dns", "DNS Records", "error", report.dns.error, "dns")
    elif report.dns.records:
        add(
            "dns",
            "DNS Records",
            "verified",
            f"{len(report.dns.records)} records resolved",
            "dns",
            "high",
            [
                *report.dns.dnsQueryEvidence,
                *[f"{record.type}:{record.value}" for record in report.dns.records[:5]],
            ],
        )
    else:
        add("dns", "DNS Records", "unavailable", "No DNS records returned by resolver", "dns")

    if report.ssl.error:
        add("tls", "TLS Certificate", "error", report.ssl.error, "tls")
    elif report.ssl.httpsAvailable:
        add(
            "tls",
            "TLS Certificate",
            "verified",
            f"{report.ssl.protocol or 'TLS'} handshake, {report.ssl.daysRemaining} days remaining",
            "tls",
            report.ssl.tlsConfidence or ("high" if report.ssl.trusted else "medium"),
            report.ssl.certificateEvidence[:5],
        )
    else:
        add("tls", "TLS Certificate", "unavailable", "HTTPS was not available during scan", "tls")

    if report.headers.error:
        add("headers", "Security Headers", "error", report.headers.error, "headers")
    elif report.headers.securityHeaders:
        present = sum(1 for header in report.headers.securityHeaders if header.status == "present")
        missing = sum(1 for header in report.headers.securityHeaders if header.status == "missing")
        warnings = sum(1 for header in report.headers.securityHeaders if header.status == "warning")
        add(
            "headers",
            "Security Headers",
            "verified",
            f"{present} present, {missing} missing, {warnings} weak",
            "headers",
            "high" if present else "medium",
            [
                *report.headers.responseEvidence[:5],
                *[f"{header.header}:{header.status}" for header in report.headers.securityHeaders],
            ],
        )
    else:
        add("headers", "Security Headers", "unavailable", "No security header checks returned", "headers")

    if report.httpOverview.error:
        add("http", "HTTP Response", "error", report.httpOverview.error, "http")
    elif report.httpOverview.statusCode:
        add(
            "http",
            "HTTP Response",
            "observed",
            f"{report.httpOverview.statusCode} final status, {report.httpOverview.redirectCount} redirects",
            "http",
            "high",
            report.httpOverview.responseEvidence,
        )
    else:
        add("http", "HTTP Response", "unavailable", "No HTTP response status captured", "http")

    if report.serverLocation.error:
        add("serverLocation", "Server Location", "error", report.serverLocation.error, "http")
    elif report.serverLocation.ip:
        location_bits = [
            value for value in (report.serverLocation.city, report.serverLocation.region, report.serverLocation.country)
            if value
        ]
        level: EvidenceLevelValue = "inferred" if report.serverLocation.networkRole == "edge-or-proxy" else "observed"
        add(
            "serverLocation",
            "Server Location",
            level,
            ", ".join(location_bits) if location_bits else report.serverLocation.ip,
            "http",
            report.serverLocation.locationConfidence or "medium",
            [*report.serverLocation.locationEvidence, *report.serverLocation.networkEvidence],
        )
    else:
        add("serverLocation", "Server Location", "unavailable", "No IP geolocation data captured", "http")

    if report.whois.error:
        add("whois", "WHOIS", "error", report.whois.error, "whois")
    elif report.whois.registrar or report.whois.nameServers:
        add(
            "whois",
            "WHOIS",
            "observed",
            report.whois.registrar or f"{len(report.whois.nameServers)} name servers",
            "whois",
            "medium",
            report.whois.whoisEvidence,
        )
    else:
        add("whois", "WHOIS", "unavailable", "Registrar data not available", "whois")

    if report.siteDiscovery.error:
        add("discovery", "Crawl Discovery", "error", report.siteDiscovery.error, "http")
    elif report.siteDiscovery.robotsPresent or report.siteDiscovery.sitemapPresent:
        add(
            "discovery",
            "Crawl Discovery",
            "observed",
            f"robots: {report.siteDiscovery.robotsPresent}, sitemap: {report.siteDiscovery.sitemapPresent}",
            "http",
            "medium",
            report.siteDiscovery.discoveryEvidence,
        )
    else:
        add("discovery", "Crawl Discovery", "unavailable", "No robots.txt or sitemap evidence observed", "http")

    if report.pageMetadata.error:
        add("metadata", "Page Metadata", "error", report.pageMetadata.error, "html")
    elif report.pageMetadata.title or report.pageMetadata.description:
        add(
            "metadata",
            "Page Metadata",
            "observed",
            report.pageMetadata.title or "Description detected",
            "html",
            "medium",
            report.pageMetadata.metadataEvidence,
        )
    else:
        add("metadata", "Page Metadata", "unavailable", "No title or description detected", "html")

    if report.techStack:
        low_confidence = [
            item for item in report.techStack
            if item.confidence == "low" or "inferred" in item.sources or _tech_is_asset_only(item.sources)
        ]
        direct = [item for item in report.techStack if item not in low_confidence]
        level = "observed" if direct else "inferred"
        confidence = "high" if any(item.confidence == "high" for item in direct) else "medium" if direct else "low"
        add(
            "techStack",
            "Tech Stack",
            level,
            f"{len(direct)} direct fingerprints, {len(low_confidence)} heuristic fingerprints",
            "html",
            confidence,
            [f"{item.name}:{item.confidence}:{'+'.join(item.sources)}" for item in report.techStack[:8]],
        )
    else:
        add("techStack", "Tech Stack", "unavailable", "No technology fingerprints detected", "html")

    if report.cookies:
        add("cookies", "Cookies", "observed", f"{len(report.cookies)} Set-Cookie values observed", "headers", "medium")
    else:
        add("cookies", "Cookies", "unavailable", "No Set-Cookie headers observed", "headers")

    if report.securityTxt.error:
        add("securityTxt", "security.txt", "error", report.securityTxt.error, "http")
    elif report.securityTxt.present:
        add("securityTxt", "security.txt", "observed", report.securityTxt.location or "Disclosure file found", "http", "medium")
    else:
        add("securityTxt", "security.txt", "unavailable", "No security.txt file observed", "http")

    actionable = sum(1 for finding in report.findings if finding.status in {"fail", "warning"})
    best_practice = sum(1 for finding in report.findings if finding.confidence == "best-practice")
    add(
        "findings",
        "Posture Findings",
        "inferred" if best_practice else "observed",
        f"{actionable} actionable findings, {best_practice} best-practice checks",
        "scanner",
        "medium" if actionable else "high",
        [f"{finding.id}:{finding.status}:{finding.confidence}" for finding in report.findings[:8]],
    )

    return items


async def _run(coro, timeout: float | None = None) -> AnalyzerResult:
    """
    Wraps an analyzer coroutine with a per-analyzer timeout.
    Returns an error AnalyzerResult instead of raising so one failure
    never aborts the whole scan.
    """
    t = timeout if timeout is not None else settings.ANALYZER_TIMEOUT_SECONDS
    try:
        return await asyncio.wait_for(coro, timeout=t)
    except asyncio.TimeoutError:
        return AnalyzerResult(key="unknown", status="error", errors=["Analyzer timed out"])
    except Exception as exc:
        return AnalyzerResult(key="unknown", status="error", errors=[str(exc)])


async def run_scan(
    target: str,
    normalized_url: str,
    hostname: str,
    force_refresh: bool = False,
) -> ScanReport:
    """
    Runs all analyzers concurrently then assembles a ScanReport.
    Results are cached for _CACHE_TTL seconds to avoid re-scanning the same
    host (e.g. when the scanning page and the report page both call this).
    """
    cached = None if force_refresh else _cache_get(hostname)
    if cached is not None:
        return cached
    async def _pipeline() -> ScanReport:
        dns_r, ssl_r, headers_r, http_r, location_r, meta_r, discovery_r, whois_r, tech_r, cookies_r, sectxt_r, shot_r = (
            await asyncio.gather(
                _run(analyze_dns(hostname)),
                _run(analyze_ssl(hostname)),
                _run(analyze_headers(normalized_url)),
                _run(analyze_http_overview(normalized_url)),
                _run(analyze_server_location(hostname)),
                _run(analyze_page_metadata(normalized_url)),
                _run(analyze_site_discovery(normalized_url)),
                _run(analyze_whois(hostname)),
                _run(analyze_tech_stack(normalized_url)),
                _run(analyze_cookies(normalized_url)),
                _run(analyze_security_txt(normalized_url)),
                _run(analyze_screenshot(normalized_url, settings.ENABLE_SCREENSHOT),
                     timeout=settings.SCREENSHOT_TIMEOUT_SECONDS),
            )
        )

        # Collect all findings from every analyzer
        all_findings = normalize_findings([
            f
            for result in (dns_r, ssl_r, headers_r, http_r, location_r, meta_r, discovery_r, whois_r, tech_r, cookies_r, sectxt_r, shot_r)
            for f in result.findings
        ])

        # Score is computed last — it depends on the combined findings list
        score_r = await _run(analyze_score(all_findings))
        score_data = score_r.data or {}

        def _err(r: AnalyzerResult) -> str | None:
            return r.errors[0] if r.errors else "Analyzer failed"

        http_overview = http_r.data if isinstance(http_r.data, HttpOverviewResult) else HttpOverviewResult(error=_err(http_r))
        server_location = (
            location_r.data
            if isinstance(location_r.data, ServerLocationResult)
            else ServerLocationResult(error=_err(location_r))
        )
        server_location = annotate_server_location_network_context(server_location, http_overview)

        report = ScanReport(
            target=target,
            normalizedUrl=normalized_url,
            hostname=hostname,
            scanTime=datetime.now(timezone.utc).isoformat(),
            score=score_data.get("score", 0),
            grade=score_data.get("grade", "F"),
            status=score_data.get("status", "High Risk"),
            summary=score_data.get("summary", ""),
            dns=dns_r.data           if isinstance(dns_r.data, DnsResult)           else DnsResult(error=_err(dns_r)),
            ssl=ssl_r.data           if isinstance(ssl_r.data, SslResult)           else SslResult(error=_err(ssl_r)),
            headers=headers_r.data   if isinstance(headers_r.data, HeadersResult)   else HeadersResult(error=_err(headers_r)),
            httpOverview=http_overview,
            serverLocation=server_location,
            pageMetadata=meta_r.data if isinstance(meta_r.data, PageMetadataResult) else PageMetadataResult(error=_err(meta_r)),
            siteDiscovery=discovery_r.data if isinstance(discovery_r.data, SiteDiscoveryResult) else SiteDiscoveryResult(error=_err(discovery_r)),
            whois=whois_r.data       if isinstance(whois_r.data, WhoisResult)       else WhoisResult(error=_err(whois_r)),
            techStack=tech_r.data    if isinstance(tech_r.data, list)               else [],
            cookies=cookies_r.data   if isinstance(cookies_r.data, list)            else [],
            securityTxt=sectxt_r.data if isinstance(sectxt_r.data, SecurityTxtResult) else SecurityTxtResult(error=_err(sectxt_r)),
            screenshot=shot_r.data    if isinstance(shot_r.data, ScreenshotResult)    else ScreenshotResult(error=_err(shot_r)),
            findings=all_findings,
        )
        report.evidenceSummary = build_evidence_summary(report)
        return report

    report = await asyncio.wait_for(_pipeline(), timeout=settings.SCAN_TIMEOUT_SECONDS)
    _cache_set(hostname, report)
    return report
