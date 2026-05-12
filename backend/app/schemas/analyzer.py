from typing import Any, Literal
from pydantic import BaseModel

from app.schemas.report import Finding


class AnalyzerResult(BaseModel):
    key:      str
    status:   Literal["success", "error"]
    data:     Any = None
    findings: list[Finding] = []
    errors:   list[str] = []
