from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.services import settings_service

router = APIRouter()


class SettingsPatch(BaseModel):
    ENABLE_SCREENSHOT:          bool  | None = None
    SCAN_TIMEOUT_SECONDS:       int   | None = None
    ANALYZER_TIMEOUT_SECONDS:   int   | None = None
    SCREENSHOT_TIMEOUT_SECONDS: int   | None = None
    FETCH_TIMEOUT_SECONDS:      int   | None = None


@router.get("/settings")
async def get_settings():
    return {"success": True, "data": settings_service.get_all()}


@router.patch("/settings")
async def patch_settings(body: SettingsPatch):
    if settings_service.get("ENV") == "production":
        return JSONResponse(
            status_code=403,
            content={"success": False, "error": "Runtime settings are disabled in production."},
        )
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    return {"success": True, "data": settings_service.patch(updates)}
