from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas.api import AnalyzeRequest, ApiResponse
from app.schemas.report import ScanReport
from app.utils.validate_target import validate_target
from datetime import datetime, timezone

router = APIRouter()


# MOCK: validate + normalize wired; scan_service TODO
@router.post("/analyze", response_model=ApiResponse)
async def analyze(body: AnalyzeRequest):
    try:
        normalized_url, hostname = validate_target(body.target)
    except ValueError as exc:
        return JSONResponse(
            status_code=400,
            content=ApiResponse(success=False, error=str(exc)).model_dump(),
        )

    report = ScanReport(
        target=body.target,
        normalizedUrl=normalized_url,
        hostname=hostname,
        scanTime=datetime.now(timezone.utc).isoformat(),
        score=0,
        grade="F",
        status="High Risk",
        summary="Scan not yet implemented — analyzers coming soon.",
    )

    return ApiResponse(success=True, data=report)
