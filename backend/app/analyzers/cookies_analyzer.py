from app.schemas.report import CookieResult
from app.schemas.analyzer import AnalyzerResult


async def analyze_cookies(normalized_url: str) -> AnalyzerResult:
    # TODO: implement from httpx response Set-Cookie headers
    return AnalyzerResult(key="cookies", status="success", data=[], findings=[])
