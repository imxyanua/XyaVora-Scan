from app.analyzers.page_metadata_analyzer import (
    _absolute_url,
    _clean_text,
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
    assert result.noindex is True
    assert result.nofollow is True
    assert result.ogTitle == "OG Title"
    assert result.ogDescription == "OG Description"
    assert result.ogImage == "https://example.com/card.png"
    assert result.canonicalUrl == "https://example.com/canonical"
    assert result.faviconUrl == "https://example.com/favicon.ico"
    assert result.language == "en"


def test_clean_text_collapses_whitespace_and_limits_length():
    assert _clean_text("  hello\n   world  ") == "hello world"
    assert _clean_text("a" * 20, limit=10) == "aaaaaaa..."


def test_absolute_url_rejects_private_targets():
    assert _absolute_url("https://example.com", "/image.png") == "https://example.com/image.png"
    assert _absolute_url("https://example.com", "http://127.0.0.1/private.png") is None
