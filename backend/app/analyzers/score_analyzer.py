from collections import defaultdict

from app.schemas.report import (
    Finding,
    FindingClassification,
    RiskGrade,
    RiskStatus,
    ScoreBreakdownItem,
    ScoreGroupBreakdown,
)
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

_GROUP_CAPS: dict[str, int] = {
    "transport": 35,
    "headers": 18,
    "dns": 22,
    "cookies": 12,
    "domain": 18,
    "disclosure": 4,
    "general": 20,
}

_CATEGORY_GROUP: dict[str, str] = {
    "SSL": "transport",
    "Headers": "headers",
    "DNS": "dns",
    "Cookies": "cookies",
    "WHOIS": "domain",
    "Security.txt": "disclosure",
    "HTTP": "general",
    "Metadata": "general",
    "Discovery": "general",
    "Tech Stack": "general",
    "Screenshot": "general",
    "General": "general",
}


def _finding_key(finding: Finding) -> str:
    return finding.id.replace("f-", "").replace("-", "_")


def _base_deduction(finding: Finding) -> int:
    if finding.status == "fail":
        return _DEDUCTIONS.get(_finding_key(finding), 0)
    if finding.status == "warning":
        return _WARN_DEDUCTIONS.get(_finding_key(finding), 0)
    return 0


def _weighted_deduction(finding: Finding, table: dict[str, int] | None = None) -> int:
    # `table` is kept for older tests and callers that patch deduction tables.
    if table is not None:
        base = table.get(_finding_key(finding), 0)
    else:
        base = _base_deduction(finding)
    if base == 0:
        return 0

    confidence = getattr(finding, "confidence", "observed")
    weight = _CONFIDENCE_WEIGHT.get(confidence, 1.0)
    return max(1, round(base * weight))


def _classification_for(finding: Finding) -> FindingClassification:
    existing = getattr(finding, "classification", None)
    if existing:
        return existing
    if finding.status in {"pass", "info"}:
        return "informational"
    confidence = getattr(finding, "confidence", "observed")
    if confidence == "verified":
        return "verified-issue"
    if confidence == "observed":
        return "observed-risk"
    if confidence == "inferred":
        return "investigation-lead"
    return "hardening-recommendation"


def _score_group(finding: Finding) -> str:
    category = getattr(finding, "category", "General")
    return _CATEGORY_GROUP.get(str(category), "general")


def _build_score_breakdown(findings: list[Finding]) -> tuple[list[ScoreBreakdownItem], list[ScoreGroupBreakdown], int]:
    raw_items: list[ScoreBreakdownItem] = []

    for finding in findings:
        base = _base_deduction(finding)
        if base <= 0:
            continue

        confidence = getattr(finding, "confidence", "observed")
        category = getattr(finding, "category", "General")
        status = getattr(finding, "status", "warning")
        weight = _CONFIDENCE_WEIGHT.get(confidence, 1.0)
        weighted = max(1, round(base * weight))
        group = _score_group(finding)
        group_cap = _GROUP_CAPS[group]
        raw_items.append(ScoreBreakdownItem(
            findingId=finding.id,
            title=getattr(finding, "title", finding.id),
            category=category,  # type: ignore[arg-type]
            status=status,  # type: ignore[arg-type]
            confidence=confidence,  # type: ignore[arg-type]
            classification=_classification_for(finding),
            group=group,
            groupCap=group_cap,
            baseDeduction=base,
            confidenceWeight=weight,
            weightedDeduction=weighted,
            appliedDeduction=weighted,
            reason=_score_reason(finding, base, weight, group_cap),
        ))

    by_group: dict[str, list[ScoreBreakdownItem]] = defaultdict(list)
    for item in raw_items:
        by_group[item.group].append(item)

    groups: list[ScoreGroupBreakdown] = []
    for group, items in by_group.items():
        raw_total = sum(item.weightedDeduction for item in items)
        cap = _GROUP_CAPS[group]
        applied_total = min(raw_total, cap)
        if raw_total > cap:
            _apply_group_cap(items, applied_total)
        groups.append(ScoreGroupBreakdown(
            group=group,
            cap=cap,
            rawDeduction=raw_total,
            appliedDeduction=sum(item.appliedDeduction for item in items),
        ))

    groups.sort(key=lambda group: group.appliedDeduction, reverse=True)
    raw_items.sort(key=lambda item: item.appliedDeduction, reverse=True)
    total_deduction = min(sum(group.appliedDeduction for group in groups), 100)
    return raw_items, groups, total_deduction


def _apply_group_cap(items: list[ScoreBreakdownItem], cap: int) -> None:
    raw_total = sum(item.weightedDeduction for item in items)
    if raw_total <= 0:
        return

    allocated = 0
    remainders: list[tuple[float, int]] = []
    for index, item in enumerate(items):
        scaled = item.weightedDeduction * cap / raw_total
        applied = int(scaled)
        item.appliedDeduction = applied
        allocated += applied
        remainders.append((scaled - applied, index))

    remaining = cap - allocated
    for _, index in sorted(remainders, reverse=True)[:remaining]:
        items[index].appliedDeduction += 1


def _score_reason(finding: Finding, base: int, weight: float, group_cap: int) -> str:
    classification = _classification_for(finding).replace("-", " ")
    status = getattr(finding, "status", "warning")
    return (
        f"{status} {classification}; base -{base}, "
        f"confidence weight {weight:g}, group cap -{group_cap}."
    )


def compute_score_details(
    findings: list[Finding],
) -> tuple[int, RiskGrade, RiskStatus, str, list[ScoreBreakdownItem], list[ScoreGroupBreakdown]]:
    breakdown, groups, deduction = _build_score_breakdown(findings)
    score = max(0, 100 - deduction)
    grade, status = _grade_status(score)

    fail_count = sum(1 for f in findings if f.status == "fail")
    warn_count = sum(1 for f in findings if f.status == "warning")
    best_practice_count = sum(1 for f in findings if getattr(f, "confidence", None) == "best-practice")
    capped_groups = [group.group for group in groups if group.rawDeduction > group.appliedDeduction]
    cap_note = f" Group caps applied to: {', '.join(capped_groups)}." if capped_groups else ""
    summary = (
        f"Found {fail_count} failed check(s), {warn_count} review observation(s), "
        f"and {best_practice_count} best-practice observation(s). "
        f"Applied deduction: {deduction}/100 after confidence weighting and group caps.{cap_note} "
        f"Risk grade: {grade} ({score}/100). Findings are posture observations, not proof of exploitation."
    )

    return score, grade, status, summary, breakdown, groups


def _grade_status(score: int) -> tuple[RiskGrade, RiskStatus]:
    if score >= 90:
        return "A", "Low Risk"
    if score >= 80:
        return "B", "Medium Risk"
    if score >= 70:
        return "C", "Medium Risk"
    if score >= 60:
        return "D", "High Risk"
    return "F", "High Risk"


def compute_score(findings: list[Finding]) -> tuple[int, RiskGrade, RiskStatus, str]:
    """
    Derives score from findings rather than from individual analyzer fields
    so the scoring logic stays in one place and is easy to adjust.
    """
    score, grade, status, summary, _, _ = compute_score_details(findings)
    return score, grade, status, summary


async def analyze_score(findings: list[Finding]) -> AnalyzerResult:
    score, grade, status, summary, breakdown, groups = compute_score_details(findings)
    return AnalyzerResult(
        key="score",
        status="success",
        data={
            "score": score,
            "grade": grade,
            "status": status,
            "summary": summary,
            "scoreBreakdown": breakdown,
            "scoreGroups": groups,
        },
        findings=[],
    )
