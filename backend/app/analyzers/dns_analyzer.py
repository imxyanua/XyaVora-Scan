from app.schemas.report import DnsResult, Finding
from app.schemas.analyzer import AnalyzerResult


async def analyze_dns(hostname: str) -> AnalyzerResult:
    # TODO: implement with dnspython
    return AnalyzerResult(key="dns", status="success", data=DnsResult(), findings=[])
