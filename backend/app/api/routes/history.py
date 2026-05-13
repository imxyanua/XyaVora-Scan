from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.services.history_service import get_all, get_by_id

router = APIRouter()


@router.get("/history")
async def history():
    return {"success": True, "data": get_all()}


@router.get("/history/{scan_id}")
async def history_by_id(scan_id: str):
    report = get_by_id(scan_id)
    if report is None:
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": "Scan not found"},
        )
    return {"success": True, "data": report}
