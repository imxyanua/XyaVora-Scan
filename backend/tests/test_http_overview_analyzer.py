import httpx

from app.analyzers.http_overview_analyzer import _content_length, _detect_cdn


def test_content_length_parses_integer():
    assert _content_length(httpx.Headers({"content-length": "1234"})) == 1234


def test_content_length_handles_missing_or_invalid():
    assert _content_length(httpx.Headers({})) is None
    assert _content_length(httpx.Headers({"content-length": "abc"})) is None


def test_detect_cdn_from_common_headers():
    provider, confidence, evidence = _detect_cdn(httpx.Headers({"cf-ray": "abc"}))
    assert provider == "Cloudflare"
    assert confidence == "high"
    assert evidence == ["cf-ray: abc"]

    provider, confidence, evidence = _detect_cdn(httpx.Headers({"x-amz-cf-id": "abc"}))
    assert provider == "Amazon CloudFront"
    assert confidence == "high"
    assert evidence == ["x-amz-cf-id: abc"]

    provider, confidence, evidence = _detect_cdn(httpx.Headers({"x-vercel-id": "iad1::abc"}))
    assert provider == "Vercel"
    assert confidence == "high"
    assert evidence == ["x-vercel-id: iad1::abc"]

    assert _detect_cdn(httpx.Headers({})) == (None, None, [])


def test_detect_cdn_distinguishes_weaker_server_header_evidence():
    provider, confidence, evidence = _detect_cdn(httpx.Headers({"server": "cloudflare"}))

    assert provider == "Cloudflare"
    assert confidence == "medium"
    assert evidence == ["server: cloudflare"]
