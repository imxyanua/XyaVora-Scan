from fastapi import APIRouter
from app.services.history_service import get_all

router = APIRouter()


@router.get("/history")
async def history():
    return {"success": True, "data": get_all()}
