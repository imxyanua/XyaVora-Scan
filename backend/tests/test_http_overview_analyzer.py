import httpx

from app.analyzers.http_overview_analyzer import _build_findings, _content_length, _detect_cdn, _response_evidence
from app.schemas.report import HttpOverviewResult, RedirectHop


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
    assert provider == "AWS CloudFront"
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


def test_detect_cdn_does_not_treat_generic_served_by_as_fastly():
    provider, confidence, evidence = _detect_cdn(httpx.Headers({"x-served-by": "origin-app-01"}))

    assert provider is None
    assert confidence is None
    assert evidence == []


def test_response_evidence_includes_core_http_facts():
    response = httpx.Response(
        200,
        headers={"content-type": "text/html", "cache-control": "max-age=60"},
        request=httpx.Request("GET", "https://example.com"),
    )

    evidence = _response_evidence(response, total_bytes=1234, elapsed_ms=55, redirect_count=1)

    assert "status_code: 200" in evidence
    assert "redirect_count: 1" in evidence
    assert "bytes_read: 1234" in evidence
    assert "content-type: text/html" in evidence


def test_build_findings_marks_http_errors_and_host_change():
    result = HttpOverviewResult(
        statusCode=404,
        finalUrl="https://www.example.com/missing",
        initialHost="example.com",
        finalHost="www.example.com",
        hostChanged=True,
        redirectHops=[
            RedirectHop(fromUrl="https://example.com", toUrl="https://www.example.com/missing", statusCode=301),
        ],
        responseEvidence=["status_code: 404"],
    )

    ids = {finding.id for finding in _build_findings(result)}

    assert "http_client_error" in ids
    assert "http_host_changed" in ids
