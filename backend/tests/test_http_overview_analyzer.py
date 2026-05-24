import httpx

from app.analyzers.http_overview_analyzer import (
    _build_findings,
    _cache_policy,
    _canonical_redirect_type,
    _content_family,
    _content_length,
    _detect_cdn,
    _redirect_summary,
    _response_evidence,
)
from app.schemas.report import HttpOverviewResult, RedirectHop


def test_content_length_parses_integer():
    assert _content_length(httpx.Headers({"content-length": "1234"})) == 1234


def test_content_length_handles_missing_or_invalid():
    assert _content_length(httpx.Headers({})) is None
    assert _content_length(httpx.Headers({"content-length": "abc"})) is None


def test_content_family_groups_common_media_types():
    assert _content_family("text/html; charset=utf-8") == "html"
    assert _content_family("application/json") == "json"
    assert _content_family("image/png") == "image"
    assert _content_family("application/octet-stream") == "other"
    assert _content_family(None) is None


def test_cache_policy_summarizes_cache_headers():
    assert _cache_policy(httpx.Headers({"cache-control": "no-store"})) == "no-store"
    assert _cache_policy(httpx.Headers({"cache-control": "private, max-age=60"})) == "private"
    assert _cache_policy(httpx.Headers({"cache-control": "public, max-age=60"})) == "cacheable"
    assert _cache_policy(httpx.Headers({"etag": '"abc"'})) == "validator-present"
    assert _cache_policy(httpx.Headers({})) == "not-specified"


def test_canonical_redirect_type_identifies_www_apex_and_cross_host():
    assert _canonical_redirect_type("example.com", "www.example.com") == "apex-to-www"
    assert _canonical_redirect_type("www.example.com", "example.com") == "www-to-apex"
    assert _canonical_redirect_type("example.com", "accounts.example.net") == "cross-host"
    assert _canonical_redirect_type("example.com", "example.com") == "none"


def test_redirect_summary_describes_security_relevant_changes():
    summary = _redirect_summary(
        redirect_count=2,
        host_changed=True,
        upgraded_to_https=True,
        downgraded_from_https=False,
        canonical_type="apex-to-www",
    )
    assert "2 redirect hop(s)" in summary
    assert "upgraded to HTTPS" in summary
    assert "apex-to-www" in summary


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
    assert "content_family: html" in evidence
    assert "cache_policy: cacheable" in evidence


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

    findings = _build_findings(result)
    ids = {finding.id for finding in findings}

    assert "http_client_error" in ids
    assert "http_host_changed" in ids
    assert next(f for f in findings if f.id == "http_client_error").classification == "investigation-lead"
    assert next(f for f in findings if f.id == "http_host_changed").classification == "informational"


def test_build_findings_marks_5xx_as_observed_risk():
    result = HttpOverviewResult(
        statusCode=503,
        finalUrl="https://example.com",
        initialHost="example.com",
        finalHost="example.com",
        hostChanged=False,
        responseEvidence=["status_code: 503"],
    )

    finding = next(f for f in _build_findings(result) if f.id == "http_server_error")

    assert finding.classification == "observed-risk"
    assert finding.confidence == "observed"


def test_build_findings_marks_https_downgrade_and_long_chain():
    result = HttpOverviewResult(
        statusCode=200,
        finalUrl="http://example.com",
        initialHost="example.com",
        finalHost="example.com",
        initialProtocol="https",
        finalProtocol="http",
        downgradedFromHttps=True,
        redirectCount=4,
        redirectHops=[
            RedirectHop(fromUrl="https://example.com", toUrl="http://example.com", statusCode=301),
            RedirectHop(fromUrl="http://example.com", toUrl="http://example.com/a", statusCode=302),
            RedirectHop(fromUrl="http://example.com/a", toUrl="http://example.com/b", statusCode=302),
            RedirectHop(fromUrl="http://example.com/b", toUrl="http://example.com", statusCode=302),
        ],
        responseEvidence=["status_code: 200"],
    )

    ids = {finding.id for finding in _build_findings(result)}

    assert "http_https_downgrade" in ids
    assert "http_redirect_chain_long" in ids
