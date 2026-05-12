from typing import Optional
from pydantic import BaseModel, field_validator

from app.schemas.report import ScanReport


class AnalyzeRequest(BaseModel):
    target: str

    @field_validator("target")
    @classmethod
    def target_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("target must not be empty")
        return v


class ApiResponse(BaseModel):
    success: bool
    data:    Optional[ScanReport] = None
    error:   Optional[str] = None
