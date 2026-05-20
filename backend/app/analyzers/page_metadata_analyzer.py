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


def parse_page_metadata(html: bytes, base_url: str) -> PageMetadataResult:
    parser = _MetadataParser()
    parser.feed(html.decode("utf-8", errors="replace"))

    robots = _clean_text(parser.robots, 200)
    robots_lower = (robots or "").lower()
    canonical_url = _absolute_url(base_url, parser.canonical_url)
    canonical_host = _host(canonical_url)
    final_host = _host(base_url)
    directives = _robots_directives(robots)
    evidence = [
        f"title: {'present' if parser.title else 'missing'}",
        f"description: {'present' if parser.description else 'missing'}",
        f"canonical: {canonical_url or 'missing'}",
        f"robots: {robots or 'missing'}",
        f"og:title: {'present' if parser.og_title else 'missing'}",
        f"og:image: {'present' if parser.og_image else 'missing'}",
    ]

    return PageMetadataResult(
        title=_clean_text(parser.title, 160),
        description=_clean_text(parser.description),
        canonicalUrl=canonical_url,
        ogTitle=_clean_text(parser.og_title, 160),
        ogDescription=_clean_text(parser.og_description),
        ogImage=_absolute_url(base_url, parser.og_image),
        faviconUrl=_absolute_url(base_url, parser.favicon_url),
        language=_clean_text(parser.language, 40),
        robots=robots,
        robotsDirectives=directives,
        canonicalHost=canonical_host,
        canonicalMatchesFinalHost=canonical_host == final_host if canonical_host and final_host else None,
        metadataEvidence=evidence,
        noindex="noindex" in robots_lower,
        nofollow="nofollow" in robots_lower,
    )


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
