import pytest
from app.services import scan_service
from app.services.scan_service import (
    annotate_server_location_network_context,
    build_evidence_summary,
    normalize_findings,
    run_scan,
)
from app.analyzers.score_analyzer import compute_score, compute_score_details
from app.schemas.analyzer import AnalyzerResult
from app.schemas.report import (
    DnsResult,
    DnsRecord,
    Finding,
    HeadersResult,
    HttpOverviewResult,
    PageMetadataResult,
    SiteDiscoveryResult,
    ScreenshotResult,
    SecurityTxtResult,
    SecurityHeaderItem,
    ServerLocationResult,
    SslResult,
    TechStackItem,
    WhoisResult,
)


# ── score_analyzer ────────────────────────────────────────────────

def test_score_no_findings():
    score, grade, status, _ = compute_score([])
    assert score == 100
    assert grade == "A"
    assert status == "Low Risk"


def test_score_single_fail():
    findings = [
        Finding(
            id="no_https", severity="high", category="SSL",
            title="HTTPS Unavailable", description="x", recommendation="x", status="fail",
        )
    ]
    score, grade, status, summary = compute_score(findings)
    assert score < 100
    assert "1 failed check" in summary
    assert "posture observations" in summary.lower()


def test_score_best_practice_warning_is_weighted_lower_than_observed():
    observed = Finding(
        id="missing_csp", severity="medium", category="Headers",
        title="Missing CSP", description="x", recommendation="x",
        status="warning", confidence="observed", source="headers",
    )
    best_practice = observed.model_copy(update={"confidence": "best-practice"})

    observed_score, *_ = compute_score([observed])
    best_practice_score, *_ = compute_score([best_practice])

    assert best_practice_score > observed_score


def test_score_details_explain_weighted_deductions():
    finding = Finding(
        id="missing_csp",
        severity="medium",
        category="Headers",
        title="Missing CSP",
        description="x",
        recommendation="x",
        status="warning",
        confidence="best-practice",
        source="scanner",
        classification="hardening-recommendation",
    )

    score, _, _, summary, breakdown, groups = compute_score_details([finding])

    assert score == 97
    assert "confidence weighting and group caps" in summary
    assert breakdown[0].baseDeduction == 5
    assert breakdown[0].confidenceWeight == 0.6
    assert breakdown[0].appliedDeduction == 3
    assert breakdown[0].group == "headers"
    assert groups[0].group == "headers"


def test_score_details_caps_header_group():
    findings = [
        Finding(
            id="missing_csp",
            severity="medium",
            category="Headers",
            title=f"Missing CSP {index}",
            description="x",
            recommendation="x",
            status="warning",
            confidence="observed",
            source="headers",
        )
        for index in range(6)
    ]

    score, *_rest, breakdown, groups = compute_score_details(findings)
    header_group = next(group for group in groups if group.group == "headers")

    assert score == 82
    assert header_group.rawDeduction == 30
    assert header_group.appliedDeduction == 18
    assert sum(item.appliedDeduction for item in breakdown) == 18


def test_score_grade_boundaries():
    from app.analyzers.score_analyzer import _grade_status

    assert _grade_status(100) == ("A", "Low Risk")
    assert _grade_status(85) == ("B", "Medium Risk")
    assert _grade_status(75) == ("C", "Medium Risk")
    assert _grade_status(65) == ("D", "High Risk")
    assert _grade_status(50) == ("F", "High Risk")


def test_score_never_negative():
    findings = [
        Finding(
            id=f"f-{i:03}", severity="high", category="Headers",
            title="x", description="x", recommendation="x", status="fail",
        )
        for i in range(20)
    ]
    score, *_ = compute_score(findings)
    assert score >= 0


def test_normalize_findings_dedupes_and_sorts_by_actionability():
    findings = [
        Finding(
            id="info-only", severity="info", category="Discovery",
            title="Sitemap Found", description="x", recommendation="x", status="pass",
        ),
        Finding(
            id="missing_csp", severity="high", category="Headers",
            title="Missing CSP", description="x", recommendation="x", status="fail",
        ),
        Finding(
            id="missing_csp", severity="high", category="Headers",
            title="Missing CSP", description="x", recommendation="x", status="fail",
        ),
        Finding(
            id="missing_referrer", severity="low", category="Headers",
            title="Missing Referrer Policy", description="x", recommendation="x", status="warning",
        ),
    ]

    normalized = normalize_findings(findings)

    assert [finding.id for finding in normalized] == [
        "missing_csp",
        "missing_referrer",
        "info-only",
    ]


def test_normalize_findings_merges_duplicate_evidence_and_strongest_confidence():
    findings = [
        Finding(
            id="missing_csp",
            severity="medium",
            category="Headers",
            title="Missing CSP",
            description="x",
            recommendation="x",
            status="fail",
            confidence="best-practice",
            source="scanner",
            evidence=["header:missing"],
        ),
        Finding(
            id="missing_csp",
            severity="high",
            category="Headers",
            title="Missing CSP",
            description="x",
            recommendation="x",
            status="fail",
            confidence="observed",
            source="headers",
            evidence=["header:missing", "status:200"],
        ),
    ]

    normalized = normalize_findings(findings)

    assert len(normalized) == 1
    assert normalized[0].severity == "high"
    assert normalized[0].confidence == "observed"
    assert normalized[0].classification == "observed-risk"
    assert normalized[0].source == "headers"
    assert normalized[0].evidence == ["header:missing", "status:200"]


def test_build_evidence_summary_marks_direct_and_heuristic_sources():
    report = scan_service.ScanReport(
        target="example.com",
        normalizedUrl="https://example.com",
        hostname="example.com",
        scanTime="2026-05-20T00:00:00Z",
        score=90,
        grade="A",
        status="Low Risk",
        summary="ok",
        dns=DnsResult(records=[DnsRecord(type="A", host="example.com", value="93.184.216.34")]),
        ssl=SslResult(
            httpsAvailable=True,
            trusted=True,
            protocol="TLSv1.3",
            daysRemaining=90,
            tlsConfidence="high",
            certificateEvidence=["issuer:Example CA"],
        ),
        headers=HeadersResult(securityHeaders=[
            SecurityHeaderItem(
                header="Content-Security-Policy",
                status="present",
                value="default-src 'self'",
                description="Restricts allowed content sources.",
            ),
        ]),
        httpOverview=HttpOverviewResult(
            statusCode=200,
            finalUrl="https://example.com",
            finalHost="example.com",
            contentType="text/html",
        ),
        techStack=[
            TechStackItem(
                name="React",
                category="JavaScript Framework",
                confidence="low",
                sources=["asset-url"],
                evidence=["asset:/static/react.js"],
            ),
        ],
        findings=[
            Finding(
                id="missing_referrer",
                severity="low",
                category="Headers",
                title="Missing Referrer Policy",
                description="x",
                recommendation="x",
                status="warning",
                confidence="best-practice",
                source="scanner",
            ),
        ],
    )

    summary = build_evidence_summary(report)
    by_module = {item.module: item for item in summary}

    assert by_module["dns"].level == "verified"
    assert by_module["tls"].confidence == "high"
    assert by_module["techStack"].level == "inferred"
    assert by_module["findings"].level == "inferred"


def test_annotate_server_location_marks_cdn_context_without_origin_claim():
    location = ServerLocationResult(
        ip="203.0.113.10",
        resolvedIp="203.0.113.10",
        city="Singapore",
        country="Singapore",
        locationConfidence="medium",
        networkRole="resolved-ip",
        locationEvidence=["ip: 203.0.113.10"],
    )
    http = HttpOverviewResult(
        statusCode=200,
        cdnProvider="Cloudflare",
        cdnConfidence="high",
        cdnEvidence=["cf-ray: abc"],
    )

    annotated = annotate_server_location_network_context(location, http)

    assert annotated.locationConfidence == "low"
    assert annotated.networkRole == "edge-or-proxy"
    assert annotated.networkProvider == "Cloudflare"
    assert "not a verified origin server" in annotated.accuracyNote
    assert "http_cdn_evidence: cf-ray: abc" in annotated.networkEvidence


# ── scan_service integration ──────────────────────────────────────

@pytest.mark.asyncio
async def test_run_scan_returns_report():
    report = await run_scan("github.com", "https://github.com", "github.com")
    assert report.hostname == "github.com"
    assert report.normalizedUrl == "https://github.com"
    assert isinstance(report.score, int)
    assert report.grade in ("A", "B", "C", "D", "F")
    assert report.status in ("Low Risk", "Medium Risk", "High Risk")


@pytest.mark.asyncio
async def test_run_scan_force_refresh_bypasses_cache(monkeypatch):
    scan_service._SCAN_CACHE.clear()
    calls = {"dns": 0, "screenshot": 0}

    async def fake_dns(hostname: str):
        calls["dns"] += 1
        return AnalyzerResult(key="dns", status="success", data=DnsResult())

    async def fake_ssl(hostname: str):
        return AnalyzerResult(key="ssl", status="success", data=SslResult())

    async def fake_headers(url: str):
        return AnalyzerResult(key="headers", status="success", data=HeadersResult())

    async def fake_http_overview(url: str):
        return AnalyzerResult(key="httpOverview", status="success", data=HttpOverviewResult())

    async def fake_server_location(hostname: str):
        return AnalyzerResult(key="serverLocation", status="success", data=ServerLocationResult(ip="203.0.113.10"))

    async def fake_page_metadata(url: str):
        return AnalyzerResult(key="pageMetadata", status="success", data=PageMetadataResult())

    async def fake_site_discovery(url: str):
        return AnalyzerResult(key="siteDiscovery", status="success", data=SiteDiscoveryResult())

    async def fake_whois(hostname: str):
        return AnalyzerResult(key="whois", status="success", data=WhoisResult())

    async def fake_tech_stack(url: str):
        return AnalyzerResult(key="techStack", status="success", data=[])

    async def fake_cookies(url: str):
        return AnalyzerResult(key="cookies", status="success", data=[])

    async def fake_security_txt(url: str):
        return AnalyzerResult(key="securityTxt", status="success", data=SecurityTxtResult())

    async def fake_screenshot(url: str, enabled: bool):
        calls["screenshot"] += 1
        return AnalyzerResult(key="screenshot", status="success", data=ScreenshotResult())

    async def fake_score(findings):
        return AnalyzerResult(
            key="score",
            status="success",
            data={"score": 100, "grade": "A", "status": "Low Risk", "summary": "ok"},
        )

    monkeypatch.setattr(scan_service, "analyze_dns", fake_dns)
    monkeypatch.setattr(scan_service, "analyze_ssl", fake_ssl)
    monkeypatch.setattr(scan_service, "analyze_headers", fake_headers)
    monkeypatch.setattr(scan_service, "analyze_http_overview", fake_http_overview)
    monkeypatch.setattr(scan_service, "analyze_server_location", fake_server_location)
    monkeypatch.setattr(scan_service, "analyze_page_metadata", fake_page_metadata)
    monkeypatch.setattr(scan_service, "analyze_site_discovery", fake_site_discovery)
    monkeypatch.setattr(scan_service, "analyze_whois", fake_whois)
    monkeypatch.setattr(scan_service, "analyze_tech_stack", fake_tech_stack)
    monkeypatch.setattr(scan_service, "analyze_cookies", fake_cookies)
    monkeypatch.setattr(scan_service, "analyze_security_txt", fake_security_txt)
    monkeypatch.setattr(scan_service, "analyze_screenshot", fake_screenshot)
    monkeypatch.setattr(scan_service, "analyze_score", fake_score)

    report = await scan_service.run_scan("example.com", "https://example.com", "example.com")
    assert report.evidenceSummary
    assert {item.module for item in report.evidenceSummary} >= {"dns", "tls", "headers", "http", "findings"}

    await scan_service.run_scan("example.com", "https://example.com", "example.com")
    assert calls["dns"] == 1

    await scan_service.run_scan(
        "example.com",
        "https://example.com",
        "example.com",
        force_refresh=True,
    )
    assert calls["dns"] == 2

    progress_events = []

    async def collect_progress(key, status, duration_ms, error, data):
        progress_events.append((key, status, duration_ms, error, data))

    await scan_service.run_scan(
        "example.com",
        "https://example.com",
        "example.com",
        force_refresh=True,
        progress_callback=collect_progress,
    )

    assert ("dns", "running", None, None, None) in progress_events
    assert any(
        key == "dns" and status == "success" and duration_ms is not None and isinstance(data, DnsResult)
        for key, status, duration_ms, _, data in progress_events
    )
    assert any(key == "score" and status == "success" for key, status, _, _, _ in progress_events)

    progress_events.clear()
    await scan_service.run_scan(
        "example.com",
        "https://example.com",
        "example.com",
        force_refresh=True,
        progress_callback=collect_progress,
        include_screenshot=False,
    )

    assert calls["screenshot"] == 3
    assert not any(key == "screenshot" for key, *_ in progress_events)


@pytest.mark.asyncio
async def test_run_scan_example_com():
    # All analyzers now implemented — verify structural correctness, not exact values
    report = await run_scan("example.com", "https://example.com", "example.com")
    assert isinstance(report.findings, list)
    assert isinstance(report.techStack, list)
    assert isinstance(report.cookies, list)
    assert isinstance(report.score, int)
    assert report.grade in ("A", "B", "C", "D", "F")
