import asyncio
import time
from datetime import datetime, timezone

from app.core.config import settings
from app.schemas.report import (
    ScanReport, DnsResult, SslResult, HeadersResult, Finding,
    HttpOverviewResult, PageMetadataResult, SiteDiscoveryResult,
    WhoisResult, SecurityTxtResult, ScreenshotResult,
)
from app.schemas.analyzer import AnalyzerResult
from app.analyzers.dns_analyzer         import analyze_dns
from app.analyzers.ssl_analyzer         import analyze_ssl
from app.analyzers.headers_analyzer     import analyze_headers
from app.analyzers.http_overview_analyzer import analyze_http_overview
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
        dns_r, ssl_r, headers_r, http_r, meta_r, discovery_r, whois_r, tech_r, cookies_r, sectxt_r, shot_r = (
            await asyncio.gather(
                _run(analyze_dns(hostname)),
                _run(analyze_ssl(hostname)),
                _run(analyze_headers(normalized_url)),
                _run(analyze_http_overview(normalized_url)),
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
            for result in (dns_r, ssl_r, headers_r, http_r, meta_r, discovery_r, whois_r, tech_r, cookies_r, sectxt_r, shot_r)
            for f in result.findings
        ])

        # Score is computed last — it depends on the combined findings list
        score_r = await _run(analyze_score(all_findings))
        score_data = score_r.data or {}

        def _err(r: AnalyzerResult) -> str | None:
            return r.errors[0] if r.errors else "Analyzer failed"

        return ScanReport(
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
            httpOverview=http_r.data if isinstance(http_r.data, HttpOverviewResult) else HttpOverviewResult(error=_err(http_r)),
            pageMetadata=meta_r.data if isinstance(meta_r.data, PageMetadataResult) else PageMetadataResult(error=_err(meta_r)),
            siteDiscovery=discovery_r.data if isinstance(discovery_r.data, SiteDiscoveryResult) else SiteDiscoveryResult(error=_err(discovery_r)),
            whois=whois_r.data       if isinstance(whois_r.data, WhoisResult)       else WhoisResult(error=_err(whois_r)),
            techStack=tech_r.data    if isinstance(tech_r.data, list)               else [],
            cookies=cookies_r.data   if isinstance(cookies_r.data, list)            else [],
            securityTxt=sectxt_r.data if isinstance(sectxt_r.data, SecurityTxtResult) else SecurityTxtResult(error=_err(sectxt_r)),
            screenshot=shot_r.data    if isinstance(shot_r.data, ScreenshotResult)    else ScreenshotResult(error=_err(shot_r)),
            findings=all_findings,
        )

    report = await asyncio.wait_for(_pipeline(), timeout=settings.SCAN_TIMEOUT_SECONDS)
    _cache_set(hostname, report)
    return report
