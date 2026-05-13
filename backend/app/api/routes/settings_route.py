from fastapi import APIRouter
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
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    return {"success": True, "data": settings_service.patch(updates)}
