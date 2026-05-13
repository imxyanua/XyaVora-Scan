from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.schemas.api import AnalyzeRequest, ApiResponse
from app.utils.validate_target import validate_target
from app.utils.rate_limiter import rate_limit
from app.services.scan_service import run_scan
from app.services import history_service

router = APIRouter()


@router.post("/analyze", response_model=ApiResponse, dependencies=[Depends(rate_limit)])
async def analyze(body: AnalyzeRequest):
    try:
        normalized_url, hostname = validate_target(body.target)
    except ValueError as exc:
        return JSONResponse(
            status_code=400,
            content=ApiResponse(success=False, error=str(exc)).model_dump(),
        )

    try:
        report = await run_scan(body.target, normalized_url, hostname)
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content=ApiResponse(success=False, error=f"Scan failed: {exc}").model_dump(),
        )

    history_service.append(report)
    return ApiResponse(success=True, data=report)
