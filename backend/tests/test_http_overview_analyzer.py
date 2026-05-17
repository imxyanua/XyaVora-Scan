import httpx

from app.analyzers.http_overview_analyzer import _content_length


def test_content_length_parses_integer():
    assert _content_length(httpx.Headers({"content-length": "1234"})) == 1234


def test_content_length_handles_missing_or_invalid():
    assert _content_length(httpx.Headers({})) is None
    assert _content_length(httpx.Headers({"content-length": "abc"})) is None
