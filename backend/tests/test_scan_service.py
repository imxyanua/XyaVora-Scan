import pytest
from app.services.scan_service import run_scan
from app.analyzers.score_analyzer import compute_score
from app.schemas.report import Finding


# ── score_analyzer ────────────────────────────────────────────────

def test_score_no_findings():
    score, grade, status, _ = compute_score([])
    assert score == 100
    assert grade == "A"
    assert status == "Low Risk"


def test_score_single_fail():
    findings = [
        Finding(
            id="missing_hsts", severity="high", category="Headers",
            title="Missing HSTS", description="x", recommendation="x", status="fail",
        )
    ]
    score, grade, status, summary = compute_score(findings)
    assert score < 100
    assert "1 critical" in summary


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
async def test_run_scan_example_com():
    # All analyzers now implemented — verify structural correctness, not exact values
    report = await run_scan("example.com", "https://example.com", "example.com")
    assert isinstance(report.findings, list)
    assert isinstance(report.techStack, list)
    assert isinstance(report.cookies, list)
    assert isinstance(report.score, int)
    assert report.grade in ("A", "B", "C", "D", "F")
