from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class AnalyzeRequest(BaseModel):
    target: str


# MOCK: placeholder until scan_service is wired up
@router.post("/analyze")
async def analyze(body: AnalyzeRequest):
    return {
        "success": True,
        "data": {
            "target": body.target,
            "normalizedUrl": f"https://{body.target}",
            "hostname": body.target,
            "scanTime": "2026-05-12T00:00:00.000Z",
            "score": 0,
            "grade": "F",
            "status": "High Risk",
            "summary": "Scan not yet implemented — mock response.",
            "dns": {},
            "ssl": {},
            "headers": {},
            "whois": {},
            "techStack": [],
            "cookies": [],
            "securityTxt": {},
            "screenshot": {},
            "findings": [],
        },
    }
