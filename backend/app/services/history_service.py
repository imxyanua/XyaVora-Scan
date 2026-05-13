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

    # Skip if this exact scan (same domain + scanTime) is already stored
    # — prevents double-writes when the in-memory cache returns the same
    # ScanReport to a second caller (e.g. ScanProgress + ReportPage).
    for e in entries[:5]:
        if e.get("domain") == report.hostname and e.get("scanTime") == report.scanTime:
            return

    entry = {
        "id":       str(uuid.uuid4()),
        "domain":   report.hostname,
        "scanTime": report.scanTime,
        "score":    report.score,
        "grade":    report.grade,
        "status":   report.status,
        "issues":   sum(1 for f in report.findings if f.status in ("fail", "warning")),
        "report":   json.loads(report.model_dump_json()),
    }
    entries.insert(0, entry)
    _save(entries[:_MAX_ENTRIES])


def get_all() -> list[dict]:
    """Return summary entries (without the full report blob)."""
    return [
        {k: v for k, v in e.items() if k != "report"}
        for e in _load()
    ]


def get_by_id(scan_id: str) -> dict | None:
    """Return the full report dict for a given scan ID, or None."""
    for entry in _load():
        if entry.get("id") == scan_id:
            return entry.get("report")
    return None
