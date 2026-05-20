import pytest
from app.services import scan_service
from app.services.scan_service import build_evidence_summary, normalize_findings, run_scan
from app.analyzers.score_analyzer import compute_score
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


def test_score_grade_boundaries():
    def _score_with_deduction(d: int) -> int:
        class _F:
            id = "no_https"
            status = "fail"
        from app.analyzers.score_analyzer import _DEDUCTIONS
        _DEDUCTIONS["no_https"] = d
        score, *_ = compute_score([_F()])  # type: ignore[arg-type]
        _DEDUCTIONS["no_https"] = 30  # restore
        return score

    assert _score_with_deduction(0) == 100   # no deduction → A
    assert _score_with_deduction(15) == 85   # → B
    assert _score_with_deduction(25) == 75   # → C
    assert _score_with_deduction(35) == 65   # → D
    assert _score_with_deduction(50) == 50   # → F


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
    calls = {"dns": 0}

    async def fake_dns(hostname: str):
        calls["dns"] += 1
        return AnalyzerResult(key="dns", status="success", data=DnsResult())

    async def fake_ssl(hostname: str):
        return AnalyzerResult(key="ssl", status="success", data=SslResult())

    async def fake_headers(url: str):
        return AnalyzerResult(key="headers", status="success", data=HeadersResult())

    async def fake_http_overview(url: str):
        return AnalyzerResult(key="httpOverview", status="success", data=HttpOverviewResult())

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


@pytest.mark.asyncio
async def test_run_scan_example_com():
    # All analyzers now implemented — verify structural correctness, not exact values
    report = await run_scan("example.com", "https://example.com", "example.com")
    assert isinstance(report.findings, list)
    assert isinstance(report.techStack, list)
    assert isinstance(report.cookies, list)
    assert isinstance(report.score, int)
    assert report.grade in ("A", "B", "C", "D", "F")
