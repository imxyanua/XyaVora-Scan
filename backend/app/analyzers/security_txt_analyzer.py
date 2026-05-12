from app.schemas.report import SecurityTxtResult
from app.schemas.analyzer import AnalyzerResult


async def analyze_security_txt(normalized_url: str) -> AnalyzerResult:
    # TODO: fetch /.well-known/security.txt and /security.txt
    return AnalyzerResult(key="securityTxt", status="success", data=SecurityTxtResult(), findings=[])
