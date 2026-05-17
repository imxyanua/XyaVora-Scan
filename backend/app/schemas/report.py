from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict


# ── Shared config: camelCase JSON output ──────────────────────────
class _Base(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


# ── Finding ───────────────────────────────────────────────────────

FindingSeverity = Literal["info", "low", "medium", "high"]
FindingStatus   = Literal["pass", "warning", "fail", "info"]
FindingCategory = Literal[
    "DNS", "SSL", "Headers", "WHOIS",
    "Tech Stack", "Cookies", "Security.txt", "Screenshot",
    "HTTP", "Metadata", "General",
]


class Finding(_Base):
    id:             str
    severity:       FindingSeverity
    category:       FindingCategory
    title:          str
    description:    str
    impact:         Optional[str] = None
    recommendation: str
    status:         FindingStatus


# ── DNS ───────────────────────────────────────────────────────────

DnsRecordType = Literal["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA"]


class DnsRecord(_Base):
    type:  DnsRecordType
    host:  str
    value: str
    ttl:   Optional[int] = None


class DnsResult(_Base):
    records:        list[DnsRecord] = []
    spfDetected:    bool = False
    dmarcDetected:  bool = False
    spfRecord:      Optional[str] = None
    dmarcRecord:    Optional[str] = None
    error:          Optional[str] = None


# ── SSL ───────────────────────────────────────────────────────────

class SslResult(_Base):
    httpsAvailable: bool = False
    issuer:         str = ""
    subject:        str = ""
    validFrom:      str = ""
    validTo:        str = ""
    daysRemaining:  int = 0
    sanDomains:     list[str] = []
    trusted:        bool = False
    protocol:       Optional[str] = None
    warning:        Optional[str] = None
    error:          Optional[str] = None


# ── HTTP Headers ──────────────────────────────────────────────────

HeaderStatus = Literal["present", "missing", "warning"]


class SecurityHeaderItem(_Base):
    header:      str
    status:      HeaderStatus
    value:       Optional[str] = None
    description: str


class HeadersResult(_Base):
    statusCode:       int = 0
    finalUrl:         str = ""
    redirectDetected: bool = False
    server:           Optional[str] = None
    xPoweredBy:       Optional[str] = None
    securityHeaders:  list[SecurityHeaderItem] = []
    error:            Optional[str] = None


class HttpOverviewResult(_Base):
    statusCode:      int = 0
    finalUrl:        str = ""
    redirectChain:   list[str] = []
    redirectCount:   int = 0
    contentType:     Optional[str] = None
    contentLength:   Optional[int] = None
    responseBytes:   int = 0
    responseTimeMs:  int = 0
    compression:     Optional[str] = None
    cacheControl:    Optional[str] = None
    expires:         Optional[str] = None
    etag:            Optional[str] = None
    lastModified:    Optional[str] = None
    error:           Optional[str] = None


class PageMetadataResult(_Base):
    title:          Optional[str] = None
    description:    Optional[str] = None
    canonicalUrl:   Optional[str] = None
    ogTitle:        Optional[str] = None
    ogDescription:  Optional[str] = None
    ogImage:        Optional[str] = None
    faviconUrl:     Optional[str] = None
    language:       Optional[str] = None
    robots:         Optional[str] = None
    noindex:        bool = False
    nofollow:       bool = False
    error:          Optional[str] = None


# ── WHOIS ─────────────────────────────────────────────────────────

class WhoisResult(_Base):
    registrar:   Optional[str] = None
    createdDate: Optional[str] = None
    updatedDate: Optional[str] = None
    expiryDate:  Optional[str] = None
    nameServers: list[str] = []
    dnssec:      Optional[str] = None
    raw:         Optional[str] = None
    error:       Optional[str] = None


# ── Tech Stack ────────────────────────────────────────────────────

TechCategory = Literal[
    "JavaScript Framework", "CSS Framework", "CDN",
    "Web Server", "Backend Framework", "CMS", "Analytics", "Hosting",
    "Database", "Other",
]
TechConfidence = Literal["high", "medium", "low"]


class TechStackItem(_Base):
    name:       str
    category:   TechCategory
    confidence: TechConfidence
    version:    Optional[str] = None


# ── Cookies ───────────────────────────────────────────────────────

class CookieResult(_Base):
    name:     str
    secure:   bool
    httpOnly: bool
    sameSite: Optional[str] = None
    expires:  Optional[str] = None
    maxAge:   Optional[int] = None
    warnings: list[str] = []


# ── Security.txt ──────────────────────────────────────────────────

class SecurityTxtResult(_Base):
    present:    bool = False
    location:   Optional[str] = None
    contact:    Optional[str] = None
    policy:     Optional[str] = None
    encryption: Optional[str] = None
    expires:    Optional[str] = None
    raw:        Optional[str] = None
    error:      Optional[str] = None


# ── Screenshot ────────────────────────────────────────────────────

class ScreenshotResult(_Base):
    url:           Optional[str] = None
    base64:        Optional[str] = None
    mobileBase64:  Optional[str] = None
    capturedAt:    Optional[str] = None
    viewport:      Optional[str] = None
    mobileViewport: Optional[str] = None
    error:         Optional[str] = None


# ── Main Report ───────────────────────────────────────────────────

RiskGrade  = Literal["A", "B", "C", "D", "F"]
RiskStatus = Literal["Low Risk", "Medium Risk", "High Risk"]


class ScanReport(_Base):
    target:        str
    normalizedUrl: str
    hostname:      str
    scanTime:      str
    score:         int
    grade:         RiskGrade
    status:        RiskStatus
    summary:       str
    dns:           DnsResult        = DnsResult()
    ssl:           SslResult        = SslResult()
    headers:       HeadersResult    = HeadersResult()
    httpOverview:  HttpOverviewResult = HttpOverviewResult()
    pageMetadata:  PageMetadataResult = PageMetadataResult()
    whois:         WhoisResult      = WhoisResult()
    techStack:     list[TechStackItem]    = []
    cookies:       list[CookieResult]     = []
    securityTxt:   SecurityTxtResult = SecurityTxtResult()
    screenshot:    ScreenshotResult  = ScreenshotResult()
    findings:      list[Finding]     = []
