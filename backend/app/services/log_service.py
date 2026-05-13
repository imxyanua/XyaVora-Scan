"""In-memory scan log — last 200 entries, no persistence needed."""
from collections import deque
from datetime import datetime, timezone

_MAX = 200
_log: deque[dict] = deque(maxlen=_MAX)


def record(
    domain: str,
    duration_ms: int,
    score: int,
    grade: str,
    status: str,
    cached: bool,
    error: str | None = None,
) -> None:
    _log.appendleft({
        "timestamp":   datetime.now(timezone.utc).isoformat(),
        "domain":      domain,
        "duration_ms": duration_ms,
        "score":       score,
        "grade":       grade,
        "status":      status,
        "cached":      cached,
        "error":       error,
    })


def get_all() -> list[dict]:
    return list(_log)
