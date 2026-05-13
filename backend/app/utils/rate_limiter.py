"""Simple in-memory sliding-window rate limiter — no external dependencies."""
import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request

# Per-IP: max LIMIT requests within WINDOW seconds
_WINDOW  = 60.0   # seconds
_LIMIT   = 10     # requests per window

_buckets: dict[str, deque] = defaultdict(deque)


def rate_limit(request: Request) -> None:
    """FastAPI dependency — raises 429 if caller exceeds the rate limit."""
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
