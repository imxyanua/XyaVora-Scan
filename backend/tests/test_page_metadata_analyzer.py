from app.analyzers.page_metadata_analyzer import (
    _absolute_url,
    _build_findings,
    _clean_text,
    _robots_directives,
    parse_page_metadata,
)


def test_parse_page_metadata_common_fields():
    html = b"""
    <html lang="en">
      <head>
        <title>Example Site</title>
        <meta name="description" content=" Plain description ">
        <meta name="robots" content="noindex, nofollow">
        <meta property="og:title" content="OG Title">
        <meta property="og:description" content="OG Description">
        <meta property="og:image" content="/card.png">
        <link rel="canonical" href="https://example.com/canonical">
        <link rel="icon" href="/favicon.ico">
      </head>
    </html>
    """

    result = parse_page_metadata(html, "https://example.com")

    assert result.title == "Example Site"
    assert result.description == "Plain description"
    assert result.robots == "noindex, nofollow"
    assert result.robotsDirectives == ["noindex", "nofollow"]
    assert result.noindex is True
    assert result.nofollow is True
    assert result.ogTitle == "OG Title"
    assert result.ogDescription == "OG Description"
    assert result.ogImage == "https://example.com/card.png"
    assert result.canonicalUrl == "https://example.com/canonical"
    assert result.canonicalHost == "example.com"
    assert result.canonicalMatchesFinalHost is True
    assert result.faviconUrl == "https://example.com/favicon.ico"
    assert result.language == "en"
    assert "title: present" in result.metadataEvidence


def test_clean_text_collapses_whitespace_and_limits_length():
    assert _clean_text("  hello\n   world  ") == "hello world"
    assert _clean_text("a" * 20, limit=10) == "aaaaaaa..."


def test_absolute_url_rejects_private_targets():
    assert _absolute_url("https://example.com", "/image.png") == "https://example.com/image.png"
    assert _absolute_url("https://example.com", "http://127.0.0.1/private.png") is None


def test_robots_directives_dedupes_and_normalizes():
    assert _robots_directives("NOINDEX, nofollow, noindex") == ["noindex", "nofollow"]


def test_build_findings_for_noindex_and_canonical_host_change():
    html = b"""
    <html>
      <head>
        <title>Example</title>
        <meta name="robots" content="noindex">
        <link rel="canonical" href="https://example.org/page">
      </head>
    </html>
    """
    result = parse_page_metadata(html, "https://example.com/page")
    findings = _build_findings(result)
    ids = {finding.id for finding in findings}

    assert "page_noindex" in ids
    assert "canonical_host_differs" in ids
    assert next(f for f in findings if f.id == "page_noindex").classification == "investigation-lead"
    assert next(f for f in findings if f.id == "canonical_host_differs").classification == "investigation-lead"
