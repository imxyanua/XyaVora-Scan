from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx

from app.schemas.analyzer import AnalyzerResult
from app.schemas.report import Finding, PageMetadataResult
from app.utils.safe_fetch import fetch_html, validate_public_http_url


class _MetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_title = False
        self.title_parts: list[str] = []
        self.description: str | None = None
        self.canonical_url: str | None = None
        self.og_title: str | None = None
        self.og_description: str | None = None
        self.og_image: str | None = None
        self.og_url: str | None = None
        self.twitter_title: str | None = None
        self.twitter_description: str | None = None
        self.twitter_image: str | None = None
        self.favicon_url: str | None = None
        self.language: str | None = None
        self.robots: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        attr = {name.lower(): (value or "").strip() for name, value in attrs}

        if tag == "html":
            self.language = attr.get("lang") or self.language
            return

        if tag == "title":
            self.in_title = True
            return

        if tag == "link":
            rel = attr.get("rel", "").lower()
            href = attr.get("href")
            if rel == "canonical" and href:
                self.canonical_url = href
            elif href and ("icon" in rel or rel == "shortcut icon"):
                self.favicon_url = self.favicon_url or href
            return

        if tag != "meta":
            return

        name = attr.get("name", "").lower()
        prop = attr.get("property", "").lower()
        content = attr.get("content", "")
        if not content:
            return

        if name == "description" and self.description is None:
            self.description = content
        elif name == "robots" and self.robots is None:
            self.robots = content
        elif prop == "og:title" and self.og_title is None:
            self.og_title = content
        elif prop == "og:description" and self.og_description is None:
            self.og_description = content
        elif prop == "og:image" and self.og_image is None:
            self.og_image = content
        elif prop == "og:url" and self.og_url is None:
            self.og_url = content
        elif name == "twitter:title" and self.twitter_title is None:
            self.twitter_title = content
        elif name == "twitter:description" and self.twitter_description is None:
            self.twitter_description = content
        elif name == "twitter:image" and self.twitter_image is None:
            self.twitter_image = content

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            text = data.strip()
            if text:
                self.title_parts.append(text)

    @property
    def title(self) -> str | None:
        text = " ".join(self.title_parts).strip()
        return text or None


def _clean_text(value: str | None, limit: int = 240) -> str | None:
    if not value:
        return None
    cleaned = " ".join(value.split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 3].rstrip() + "..."


def _normalized_text(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = " ".join(value.split())
    return cleaned or None


def _absolute_url(base_url: str, value: str | None) -> str | None:
    if not value:
        return None
    try:
        return validate_public_http_url(urljoin(base_url, value))
    except Exception:
        return None


def _robots_directives(value: str | None) -> list[str]:
    if not value:
        return []
    directives: list[str] = []
    for part in value.split(","):
        directive = part.strip().lower()
        if directive and directive not in directives:
            directives.append(directive)
    return directives


def _host(value: str | None) -> str | None:
    if not value:
        return None
    return urlparse(value).hostname


def _metadata_issues(
    title: str | None,
    description: str | None,
    canonical_url: str | None,
    canonical_matches_final_host: bool | None,
    robots_directives: list[str],
    social_tags_present: bool,
    social_image_present: bool,
) -> list[str]:
    issues: list[str] = []
    title_len = len(title or "")
    description_len = len(description or "")

    if not title:
        issues.append("missing-title")
    elif title_len < 10:
        issues.append("title-too-short")
    elif title_len > 70:
        issues.append("title-too-long")

    if not description:
        issues.append("missing-description")
    elif description_len < 50:
        issues.append("description-too-short")
    elif description_len > 170:
        issues.append("description-too-long")

    if not canonical_url:
        issues.append("missing-canonical")
    elif canonical_matches_final_host is False:
        issues.append("canonical-host-differs")

    if "noindex" in robots_directives:
        issues.append("robots-noindex")
    if "nofollow" in robots_directives:
        issues.append("robots-nofollow")

    if not social_tags_present:
        issues.append("missing-social-tags")
    elif not social_image_present:
        issues.append("missing-social-image")

    return issues


def _metadata_quality(issues: list[str]) -> str:
    high_impact = {
        "missing-title",
        "missing-description",
        "robots-noindex",
        "canonical-host-differs",
    }
    if any(issue in high_impact for issue in issues) or len(issues) >= 4:
        return "low"
    if issues:
        return "medium"
    return "high"


def parse_page_metadata(html: bytes, base_url: str) -> PageMetadataResult:
    parser = _MetadataParser()
    parser.feed(html.decode("utf-8", errors="replace"))

    robots = _clean_text(parser.robots, 200)
    robots_lower = (robots or "").lower()
    canonical_url = _absolute_url(base_url, parser.canonical_url)
    canonical_host = _host(canonical_url)
    final_host = _host(base_url)
    canonical_matches = canonical_host == final_host if canonical_host and final_host else None
    directives = _robots_directives(robots)
    title_full = _normalized_text(parser.title)
    description_full = _normalized_text(parser.description)
    og_image = _absolute_url(base_url, parser.og_image)
    twitter_image = _absolute_url(base_url, parser.twitter_image)
    social_tags_present = bool(parser.og_title or parser.og_description or parser.og_image or parser.twitter_title or parser.twitter_description or parser.twitter_image)
    social_image_present = bool(og_image or twitter_image)
    issues = _metadata_issues(
        title_full,
        description_full,
        canonical_url,
        canonical_matches,
        directives,
        social_tags_present,
        social_image_present,
    )
    evidence = [
        f"title: {'present' if parser.title else 'missing'}",
        f"title_length: {len(title_full or '')}",
        f"description: {'present' if parser.description else 'missing'}",
        f"description_length: {len(description_full or '')}",
        f"canonical: {canonical_url or 'missing'}",
        f"canonical_matches_final_host: {canonical_matches if canonical_matches is not None else 'unknown'}",
        f"robots: {robots or 'missing'}",
        f"og:title: {'present' if parser.og_title else 'missing'}",
        f"og:image: {'present' if parser.og_image else 'missing'}",
        f"twitter:title: {'present' if parser.twitter_title else 'missing'}",
        f"twitter:image: {'present' if parser.twitter_image else 'missing'}",
        f"metadata_quality: {_metadata_quality(issues)}",
        f"metadata_issues: {', '.join(issues) if issues else 'none'}",
    ]

    return PageMetadataResult(
        title=_clean_text(parser.title, 160),
        description=_clean_text(parser.description),
        canonicalUrl=canonical_url,
        ogTitle=_clean_text(parser.og_title, 160),
        ogDescription=_clean_text(parser.og_description),
        ogImage=og_image,
        ogUrl=_absolute_url(base_url, parser.og_url),
        twitterTitle=_clean_text(parser.twitter_title, 160),
        twitterDescription=_clean_text(parser.twitter_description),
        twitterImage=twitter_image,
        faviconUrl=_absolute_url(base_url, parser.favicon_url),
        language=_clean_text(parser.language, 40),
        robots=robots,
        robotsDirectives=directives,
        canonicalHost=canonical_host,
        canonicalMatchesFinalHost=canonical_matches,
        titleLength=len(title_full or ""),
        descriptionLength=len(description_full or ""),
        socialTagsPresent=social_tags_present,
        socialImagePresent=social_image_present,
        metadataQuality=_metadata_quality(issues),  # type: ignore[arg-type]
        metadataIssues=issues,
        metadataEvidence=evidence,
        noindex="noindex" in robots_lower,
        nofollow="nofollow" in robots_lower,
    )


def _metadata_verification() -> str:
    return "Open the final page HTML and inspect <meta name=\"robots\"> and <link rel=\"canonical\"> values."


def _build_findings(result: PageMetadataResult) -> list[Finding]:
    findings: list[Finding] = []

    if result.noindex:
        findings.append(Finding(
            id="page_noindex",
            severity="info",
            category="Metadata",
            title="Page Requests No Indexing",
            description="The page robots metadata includes noindex.",
            impact="Search engines may avoid indexing this page. This is often intentional for private or utility pages.",
            recommendation="Confirm noindex is expected for the scanned public page.",
            status="info",
            confidence="observed",
            source="html",
            evidence=result.metadataEvidence,
            analysis="The scanner parsed the final page HTML and found a robots directive containing noindex.",
            verification=_metadata_verification(),
            classification="investigation-lead",
        ))

    if result.canonicalMatchesFinalHost is False:
        findings.append(Finding(
            id="canonical_host_differs",
            severity="info",
            category="Metadata",
            title="Canonical URL Points To A Different Host",
            description=f"The canonical URL host is {result.canonicalHost}, which differs from the final page host.",
            impact="This can be expected for regional/canonical domains, but it affects how the page should be interpreted.",
            recommendation="Verify the canonical URL is intentional and points to the preferred public URL.",
            status="info",
            confidence="observed",
            source="html",
            evidence=result.metadataEvidence,
            analysis="The scanner parsed the canonical URL from the final page HTML and its host differs from the final response host.",
            verification=_metadata_verification(),
            classification="investigation-lead",
        ))

    if "missing-title" in result.metadataIssues:
        findings.append(Finding(
            id="metadata_missing_title",
            severity="low",
            category="Metadata",
            title="Page Title Not Observed",
            description="The final HTML did not include a usable <title> value.",
            impact="Users, browser tabs, bookmarks, and search results may show a weak or generic page label.",
            recommendation="Add a concise, unique title that describes the page.",
            status="warning",
            confidence="observed",
            source="html",
            evidence=result.metadataEvidence,
            analysis="The scanner parsed the final HTML and did not find non-empty title text.",
            verification=_metadata_verification(),
            classification="observed-risk",
        ))

    if "missing-description" in result.metadataIssues:
        findings.append(Finding(
            id="metadata_missing_description",
            severity="low",
            category="Metadata",
            title="Meta Description Not Observed",
            description="The final HTML did not include a usable meta description.",
            impact="Search and sharing previews may have less useful summary text.",
            recommendation="Add a concise meta description that summarizes the page content.",
            status="warning",
            confidence="observed",
            source="html",
            evidence=result.metadataEvidence,
            analysis="The scanner parsed the final HTML and did not find a non-empty meta description.",
            verification=_metadata_verification(),
            classification="observed-risk",
        ))

    if "missing-social-tags" in result.metadataIssues or "missing-social-image" in result.metadataIssues:
        findings.append(Finding(
            id="metadata_social_tags_incomplete",
            severity="info",
            category="Metadata",
            title="Social Preview Metadata Is Incomplete",
            description="Open Graph or Twitter card metadata is missing or lacks a preview image.",
            impact="Shared links may render with weaker previews on social platforms and messaging apps.",
            recommendation="Add Open Graph title, description, image, and Twitter card equivalents where public sharing matters.",
            status="info",
            confidence="observed",
            source="html",
            evidence=result.metadataEvidence,
            analysis="The scanner parsed social preview meta tags from the final HTML and found incomplete coverage.",
            verification=_metadata_verification(),
            classification="informational",
        ))

    return findings


async def analyze_page_metadata(normalized_url: str) -> AnalyzerResult:
    try:
        response, body = await fetch_html(normalized_url)
        result = parse_page_metadata(body, str(response.url))
    except httpx.TimeoutException:
        return AnalyzerResult(
            key="pageMetadata",
            status="error",
            data=PageMetadataResult(error="Request timed out"),
            findings=[],
            errors=["Request timed out"],
        )
    except httpx.RequestError as exc:
        return AnalyzerResult(
            key="pageMetadata",
            status="error",
            data=PageMetadataResult(error=str(exc)),
            findings=[],
            errors=[str(exc)],
        )

    return AnalyzerResult(key="pageMetadata", status="success", data=result, findings=_build_findings(result))
