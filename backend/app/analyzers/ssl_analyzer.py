from app.schemas.report import SslResult
from app.schemas.analyzer import AnalyzerResult


async def analyze_ssl(hostname: str) -> AnalyzerResult:
    # TODO: implement with ssl/socket
    return AnalyzerResult(key="ssl", status="success", data=SslResult(), findings=[])
