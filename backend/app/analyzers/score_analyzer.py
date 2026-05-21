from app.schemas.report import Finding, RiskGrade, RiskStatus
from app.schemas.analyzer import AnalyzerResult

# Deductions for fail-status findings.
_DEDUCTIONS: dict[str, int] = {
    "no_https":            30,
    "ssl_expired":         20,
    "ssl_expiring_soon":    5,
    "missing_spf":          8,
    "missing_dmarc":        8,
    "dmarc_not_strict":     4,
    "cookie_no_secure":     5,
    "cookie_no_httponly":   4,
    "domain_expired":      15,
}

# Deductions for warning-status findings (smaller impact).
_WARN_DEDUCTIONS: dict[str, int] = {
    "missing_hsts":          5,
    "missing_csp":           5,
    "missing_x_frame":       2,
    "missing_xcto":          2,
    "missing_referrer":      1,
    "missing_permissions":   1,
    "weak_hsts":             4,
    "weak_csp":              4,
    "weak_x_frame":          2,
    "weak_xcto":             2,
    "weak_referrer_policy":  1,
    "domain_expiring_soon":   5,
    "dnssec_not_enabled":     3,
    "cookie_no_samesite":     2,
    "no_security_txt":        2,
    "security_txt_no_contact":1,
}

_CONFIDENCE_WEIGHT: dict[str, float] = {
    "verified": 1.0,
    "observed": 1.0,
    "best-practice": 0.6,
    "inferred": 0.5,
}


def _finding_key(finding: Finding) -> str:
    return finding.id.replace("f-", "").replace("-", "_")


def _weighted_deduction(finding: Finding, table: dict[str, int]) -> int:
    base = table.get(_finding_key(finding), 0)
    if base == 0:
        return 0

    confidence = getattr(finding, "confidence", "observed")
    weight = _CONFIDENCE_WEIGHT.get(confidence, 1.0)
    return max(1, round(base * weight))


def compute_score(findings: list[Finding]) -> tuple[int, RiskGrade, RiskStatus, str]:
    """
    Derives score from findings rather than from individual analyzer fields
    so the scoring logic stays in one place and is easy to adjust.
    """
    deduction = sum(_weighted_deduction(f, _DEDUCTIONS) for f in findings if f.status == "fail")
    deduction += sum(_weighted_deduction(f, _WARN_DEDUCTIONS) for f in findings if f.status == "warning")
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
    best_practice_count = sum(1 for f in findings if getattr(f, "confidence", None) == "best-practice")
    summary = (
        f"Found {fail_count} failed check(s), {warn_count} review observation(s), "
        f"and {best_practice_count} best-practice observation(s). "
        f"Risk grade: {grade} ({score}/100). Findings are posture observations, not proof of exploitation."
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
