import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.schemas.report import ScanReport

_HISTORY_FILE = Path(__file__).parent.parent.parent / "history.json"
_MAX_ENTRIES = 100


def _load() -> list[dict]:
    if not _HISTORY_FILE.exists():
        return []
    try:
        return json.loads(_HISTORY_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save(entries: list[dict]) -> None:
    _HISTORY_FILE.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def append(report: ScanReport) -> None:
    entries = _load()
    entry = {
        "id":       str(uuid.uuid4()),
        "domain":   report.hostname,
        "scanTime": report.scanTime,
        "score":    report.score,
        "grade":    report.grade,
        "status":   report.status,
        "issues":   sum(1 for f in report.findings if f.status in ("fail", "warning")),
    }
    entries.insert(0, entry)
    _save(entries[:_MAX_ENTRIES])


def get_all() -> list[dict]:
    return _load()
