from app.schemas.report import WhoisResult
from app.schemas.analyzer import AnalyzerResult


async def analyze_whois(hostname: str) -> AnalyzerResult:
    # TODO: implement with python-whois
    return AnalyzerResult(key="whois", status="success", data=WhoisResult(), findings=[])
