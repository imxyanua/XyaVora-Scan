import httpx

from app.analyzers.http_overview_analyzer import _content_length, _detect_cdn


def test_content_length_parses_integer():
    assert _content_length(httpx.Headers({"content-length": "1234"})) == 1234


def test_content_length_handles_missing_or_invalid():
    assert _content_length(httpx.Headers({})) is None
    assert _content_length(httpx.Headers({"content-length": "abc"})) is None


def test_detect_cdn_from_common_headers():
    assert _detect_cdn(httpx.Headers({"cf-ray": "abc"})) == "Cloudflare"
    assert _detect_cdn(httpx.Headers({"x-amz-cf-id": "abc"})) == "Amazon CloudFront"
    assert _detect_cdn(httpx.Headers({"x-vercel-id": "iad1::abc"})) == "Vercel"
    assert _detect_cdn(httpx.Headers({})) is None
