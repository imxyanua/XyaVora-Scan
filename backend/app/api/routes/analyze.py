import time

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.schemas.api import AnalyzeRequest, ApiResponse
from app.utils.validate_target import validate_target
from app.utils.rate_limiter import rate_limit
from app.services.scan_service import run_scan, is_cached
from app.services import history_service, log_service

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

    t0 = time.monotonic()
    try:
        cached = False if body.force_refresh else is_cached(hostname)
        report = await run_scan(
            body.target,
            normalized_url,
            hostname,
            force_refresh=body.force_refresh,
        )
    except Exception as exc:
        duration_ms = int((time.monotonic() - t0) * 1000)
        log_service.record(
            domain=hostname, duration_ms=duration_ms,
            score=0, grade="F", status="High Risk",
            cached=False, error=str(exc),
        )
        return JSONResponse(
            status_code=500,
            content=ApiResponse(success=False, error=f"Scan failed: {exc}").model_dump(),
        )

    duration_ms = int((time.monotonic() - t0) * 1000)
    log_service.record(
        domain=report.hostname, duration_ms=duration_ms,
        score=report.score, grade=report.grade, status=report.status,
        cached=cached,
    )
    history_service.append(report)
    return ApiResponse(success=True, data=report)
