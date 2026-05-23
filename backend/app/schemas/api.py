from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator

from app.schemas.report import ScanReport


class AnalyzeRequest(BaseModel):
    target: str
    force_refresh: bool = False
    save_history: bool = False

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


ScanJobState = Literal["queued", "running", "completed", "failed"]
ScanJobStepState = Literal["pending", "running", "success", "error"]


class ScanJobStep(BaseModel):
    key: str
    label: str
    status: ScanJobStepState = "pending"
    duration_ms: Optional[int] = None
    error: Optional[str] = None


class ScanJobSnapshot(BaseModel):
    job_id: str
    target: str
    hostname: str
    normalized_url: str
    status: ScanJobState
    progress: int
    created_at: str
    updated_at: str
    elapsed_ms: int
    steps: list[ScanJobStep] = Field(default_factory=list)
    report: Optional[ScanReport] = None
    error: Optional[str] = None


class ScanJobResponse(BaseModel):
    success: bool
    data: Optional[ScanJobSnapshot] = None
    error: Optional[str] = None
