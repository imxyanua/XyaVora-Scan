"""Simple in-memory sliding-window rate limiter — no external dependencies."""
import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request

# Per-IP: max LIMIT requests within WINDOW seconds
_WINDOW    = 60.0   # seconds
_LIMIT     = 10     # requests per window
_GC_EVERY  = 300.0  # clean up idle IPs every 5 minutes

_buckets: dict[str, deque] = defaultdict(deque)
_last_gc: float = time.monotonic()


def _gc() -> None:
    """Remove IPs whose last request is older than the window."""
    global _last_gc
    now = time.monotonic()
    if now - _last_gc < _GC_EVERY:
        return
    _last_gc = now
    stale = [ip for ip, dq in _buckets.items() if not dq or now - dq[-1] > _WINDOW]
    for ip in stale:
        del _buckets[ip]


def rate_limit(request: Request) -> None:
    """FastAPI dependency — raises 429 if caller exceeds the rate limit."""
    _gc()
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = _buckets[ip]

    # Drop timestamps outside the sliding window
    while bucket and now - bucket[0] > _WINDOW:
        bucket.popleft()

    if len(bucket) >= _LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: max {_LIMIT} scans per {int(_WINDOW)}s per IP.",
        )

    bucket.append(now)
