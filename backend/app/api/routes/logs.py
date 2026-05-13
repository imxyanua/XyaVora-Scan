from fastapi import APIRouter
from app.services import log_service

router = APIRouter()


@router.get("/logs")
async def get_logs():
    return {"success": True, "data": log_service.get_all()}
