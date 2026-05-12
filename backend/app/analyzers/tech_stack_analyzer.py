from app.schemas.report import TechStackItem
from app.schemas.analyzer import AnalyzerResult


async def analyze_tech_stack(normalized_url: str) -> AnalyzerResult:
    # TODO: implement custom rules from headers + HTML
    return AnalyzerResult(key="techStack", status="success", data=[], findings=[])
