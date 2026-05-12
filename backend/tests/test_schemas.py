from app.schemas.report import (
    ScanReport, Finding, DnsResult, DnsRecord,
    SslResult, HeadersResult, SecurityHeaderItem,
)
from app.schemas.api import AnalyzeRequest, ApiResponse
import pytest


def test_scan_report_defaults():
    report = ScanReport(
        target="example.com",
        normalizedUrl="https://example.com",
        hostname="example.com",
        scanTime="2026-05-12T00:00:00Z",
        score=82,
        grade="B",
        status="Medium Risk",
        summary="test",
    )
    assert report.score == 82
    assert report.grade == "B"
    assert report.findings == []
    assert report.techStack == []


def test_scan_report_camel_case_json():
    report = ScanReport(
        target="example.com",
        normalizedUrl="https://example.com",
        hostname="example.com",
        scanTime="2026-05-12T00:00:00Z",
        score=50,
        grade="D",
        status="High Risk",
        summary="x",
    )
    data = report.model_dump()
    # camelCase keys must be present in serialized output
    assert "normalizedUrl" in data
    assert "scanTime" in data
    assert "techStack" in data
    assert "securityTxt" in data


def test_finding_all_fields():
    f = Finding(
        id="f-001",
        severity="high",
        category="Headers",
        title="Missing CSP",
        description="No CSP header set.",
        impact="XSS risk.",
        recommendation="Add Content-Security-Policy header.",
        status="fail",
    )
    assert f.severity == "high"
    assert f.impact == "XSS risk."


def test_finding_impact_optional():
    f = Finding(
        id="f-002",
        severity="info",
        category="DNS",
        title="SPF present",
        description="SPF record found.",
        recommendation="No action needed.",
        status="pass",
    )
    assert f.impact is None


def test_api_response_success():
    report = ScanReport(
        target="x.com", normalizedUrl="https://x.com", hostname="x.com",
        scanTime="2026-01-01T00:00:00Z", score=90, grade="A",
        status="Low Risk", summary="ok",
    )
    resp = ApiResponse(success=True, data=report)
    assert resp.success is True
    assert resp.error is None


def test_api_response_error():
    resp = ApiResponse(success=False, error="Invalid domain")
    assert resp.data is None
    assert resp.error == "Invalid domain"


def test_analyze_request_empty_raises():
    with pytest.raises(Exception):
        AnalyzeRequest(target="")


def test_dns_result_defaults():
    dns = DnsResult()
    assert dns.spfDetected is False
    assert dns.records == []


def test_security_header_item():
    item = SecurityHeaderItem(
        header="Strict-Transport-Security",
        status="missing",
        description="Enforces HTTPS.",
    )
    assert item.value is None
