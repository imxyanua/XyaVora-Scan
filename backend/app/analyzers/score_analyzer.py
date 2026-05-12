from app.schemas.report import Finding, RiskGrade, RiskStatus
from app.schemas.analyzer import AnalyzerResult

# Point deductions per finding category. Tuned so a domain missing all headers
# lands around 30–40 (grade F/D) and a fully configured domain scores 90+ (grade A).
_DEDUCTIONS: dict[str, int] = {
    "no_https":            30,
    "ssl_expired":         20,
    "ssl_expiring_soon":    5,
    "missing_hsts":        10,
    "missing_csp":         10,
    "missing_x_frame":      5,
    "missing_xcto":         5,
    "missing_referrer":     3,
    "missing_permissions":  3,
    "missing_spf":          8,
    "missing_dmarc":        8,
    "dmarc_not_strict":     4,
    "server_exposed":       2,
    "cookie_no_secure":     3,
    "cookie_no_httponly":   3,
    "cookie_no_samesite":   2,
}


def compute_score(findings: list[Finding]) -> tuple[int, RiskGrade, RiskStatus, str]:
    """
    Derives score from findings rather than from individual analyzer fields
    so the scoring logic stays in one place and is easy to adjust.
    """
    deduction = sum(
        _DEDUCTIONS.get(f.id.replace("f-", "").replace("-", "_"), 0)
        for f in findings
        if f.status == "fail"
    )
    # Cap deduction at 100 to avoid negative scores
    score = max(0, 100 - deduction)

    if score >= 90:
        grade: RiskGrade  = "A"
        status: RiskStatus = "Low Risk"
    elif score >= 80:
        grade  = "B"
        status = "Medium Risk"
    elif score >= 70:
        grade  = "C"
        status = "Medium Risk"
    elif score >= 60:
        grade  = "D"
        status = "High Risk"
    else:
        grade  = "F"
        status = "High Risk"

    fail_count = sum(1 for f in findings if f.status == "fail")
    warn_count = sum(1 for f in findings if f.status == "warning")
    summary = (
        f"Found {fail_count} critical issue(s) and {warn_count} warning(s). "
        f"Risk grade: {grade} ({score}/100)."
    )

    return score, grade, status, summary


async def analyze_score(findings: list[Finding]) -> AnalyzerResult:
    score, grade, status, summary = compute_score(findings)
    return AnalyzerResult(
        key="score",
        status="success",
        data={"score": score, "grade": grade, "status": status, "summary": summary},
        findings=[],
    )
