from app.analyzers.site_discovery_analyzer import parse_robots_txt, parse_sitemap_xml


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
