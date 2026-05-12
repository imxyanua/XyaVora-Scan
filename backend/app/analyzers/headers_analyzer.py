from app.schemas.report import HeadersResult
from app.schemas.analyzer import AnalyzerResult


async def analyze_headers(normalized_url: str) -> AnalyzerResult:
    # TODO: implement with httpx
    return AnalyzerResult(key="headers", status="success", data=HeadersResult(), findings=[])
