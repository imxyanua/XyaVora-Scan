"""Runtime settings overrides — resets on server restart."""
from app.core.config import settings as _base

_overrides: dict = {}


def get_all() -> dict:
    return {
        "ENABLE_SCREENSHOT":         _overrides.get("ENABLE_SCREENSHOT",         _base.ENABLE_SCREENSHOT),
        "SCAN_TIMEOUT_SECONDS":      _overrides.get("SCAN_TIMEOUT_SECONDS",      _base.SCAN_TIMEOUT_SECONDS),
        "ANALYZER_TIMEOUT_SECONDS":  _overrides.get("ANALYZER_TIMEOUT_SECONDS",  _base.ANALYZER_TIMEOUT_SECONDS),
        "SCREENSHOT_TIMEOUT_SECONDS":_overrides.get("SCREENSHOT_TIMEOUT_SECONDS",_base.SCREENSHOT_TIMEOUT_SECONDS),
        "FETCH_TIMEOUT_SECONDS":     _overrides.get("FETCH_TIMEOUT_SECONDS",     _base.FETCH_TIMEOUT_SECONDS),
        "MAX_HTML_BYTES":            _overrides.get("MAX_HTML_BYTES",            _base.MAX_HTML_BYTES),
        "CORS_ORIGIN":               _base.CORS_ORIGIN,
        "ENV":                       _base.ENV,
    }


def get(key: str):
    return _overrides.get(key, getattr(_base, key, None))


def patch(updates: dict) -> dict:
    allowed = {"ENABLE_SCREENSHOT", "SCAN_TIMEOUT_SECONDS",
                "ANALYZER_TIMEOUT_SECONDS", "SCREENSHOT_TIMEOUT_SECONDS",
                "FETCH_TIMEOUT_SECONDS"}
    for k, v in updates.items():
        if k in allowed:
            _overrides[k] = v
    return get_all()
