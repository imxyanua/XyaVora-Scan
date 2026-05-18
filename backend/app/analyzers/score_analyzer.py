from app.schemas.report import Finding, RiskGrade, RiskStatus
from app.schemas.analyzer import AnalyzerResult

# Deductions for fail-status findings.
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
    "cookie_no_secure":     5,
    "cookie_no_httponly":   4,
    "domain_expired":      15,
}

# Deductions for warning-status findings (smaller impact).
_WARN_DEDUCTIONS: dict[str, int] = {
    "domain_expiring_soon":   5,
    "dnssec_not_enabled":     3,
    "cookie_no_samesite":     2,
    "no_security_txt":        2,
    "security_txt_no_contact":1,
}


def compute_score(findings: list[Finding]) -> tuple[int, RiskGrade, RiskStatus, str]:
    """
    Derives score from findings rather than from individual analyzer fields
    so the scoring logic stays in one place and is easy to adjust.
    """
    def _key(f: Finding) -> str:
        return f.id.replace("f-", "").replace("-", "_")

    deduction = sum(_DEDUCTIONS.get(_key(f), 0) for f in findings if f.status == "fail")
    deduction += sum(_WARN_DEDUCTIONS.get(_key(f), 0) for f in findings if f.status == "warning")
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
        f"Found {fail_count} failed check(s) and {warn_count} review item(s). "
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
