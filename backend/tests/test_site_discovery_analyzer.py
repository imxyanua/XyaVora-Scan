from app.analyzers.site_discovery_analyzer import _build_findings, _text_evidence, parse_robots_txt, parse_sitemap_xml
from app.schemas.report import SiteDiscoveryResult


def test_parse_robots_txt_extracts_crawl_rules_and_sitemaps():
    parsed = parse_robots_txt(
        """
        User-agent: *
        Disallow: /admin
        Allow: /admin/help
        Crawl-delay: 10
        Sitemap: https://example.com/sitemap.xml
        """
    )

    assert parsed["userAgents"] == ["*"]
    assert parsed["disallowRules"] == ["/admin"]
    assert parsed["allowRules"] == ["/admin/help"]
    assert parsed["crawlDelay"] == "10"
    assert parsed["sitemapUrls"] == ["https://example.com/sitemap.xml"]
    assert parsed["disallowAll"] is False


def test_parse_robots_txt_detects_disallow_all():
    parsed = parse_robots_txt(
        """
        User-agent: *
        Disallow: /
        """
    )

    assert parsed["disallowAll"] is True


def test_parse_sitemap_xml_counts_urlset_entries():
    url_count, sitemap_count, locations = parse_sitemap_xml(
        """
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://example.com/</loc></url>
          <url><loc>https://example.com/about</loc></url>
        </urlset>
        """
    )

    assert url_count == 2
    assert sitemap_count == 0
    assert locations == ["https://example.com/", "https://example.com/about"]


def test_parse_sitemap_xml_counts_sitemap_index_entries():
    url_count, sitemap_count, locations = parse_sitemap_xml(
        """
        <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <sitemap><loc>https://example.com/posts.xml</loc></sitemap>
        </sitemapindex>
        """
    )

    assert url_count == 0
    assert sitemap_count == 1
    assert locations == ["https://example.com/posts.xml"]


def test_text_evidence_includes_status_and_size():
    evidence = _text_evidence("robots", "https://example.com/robots.txt", 200, "https://example.com/robots.txt", "abc")

    assert "robots.status_code: 200" in evidence
    assert "robots.bytes_read: 3" in evidence


def test_build_findings_includes_discovery_evidence():
    result = SiteDiscoveryResult(
        robotsPresent=True,
        robotsUrl="https://example.com/robots.txt",
        sitemapPresent=True,
        sitemapUrlCount=2,
        sitemapIndexCount=0,
        robotsEvidence=["robots.status_code: 200"],
        sitemapEvidence=["sitemap.status_code: 200"],
    )

    findings = _build_findings(result)
    robots = next(f for f in findings if f.id == "robots_txt_present")
    sitemap = next(f for f in findings if f.id == "sitemap_present")

    assert robots.source == "http"
    assert robots.evidence == ["robots.status_code: 200"]
    assert sitemap.evidence == ["sitemap.status_code: 200"]
