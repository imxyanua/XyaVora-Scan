// ─────────────────────────────────────────────
//  XyaVora-Scan — Shared Types
//  Must stay in sync with backend types/report.ts
// ─────────────────────────────────────────────

// ── Core enums ───────────────────────────────

export type FindingSeverity = "info" | "low" | "medium" | "high";
export type FindingStatus   = "pass" | "warning" | "fail" | "info";
export type FindingConfidence = "verified" | "observed" | "inferred" | "best-practice";
export type FindingSource = "dns" | "tls" | "headers" | "http" | "html" | "cookie" | "whois" | "scanner";
export type FindingCategory =
  | "DNS"
  | "SSL"
  | "Headers"
  | "WHOIS"
  | "Tech Stack"
  | "Cookies"
  | "Security.txt"
  | "Screenshot"
  | "HTTP"
  | "Metadata"
  | "Discovery"
  | "General";

export type RiskGrade  = "A" | "B" | "C" | "D" | "F";
export type RiskStatus = "Low Risk" | "Medium Risk" | "High Risk";

// ── Finding ──────────────────────────────────

export interface Finding {
  id:             string;
  severity:       FindingSeverity;
  category:       FindingCategory;
  title:          string;
  description:    string;
  impact?:        string;
  recommendation: string;
  status:         FindingStatus;
  confidence?:    FindingConfidence;
  source?:        FindingSource;
  evidence?:      string[];
}

// ── DNS ──────────────────────────────────────

export interface DnsRecord {
  type:  "A" | "AAAA" | "MX" | "NS" | "TXT" | "CNAME" | "SOA";
  host:  string;
  value: string;
  ttl?:  number;
}

export interface DnsResult {
  records:       DnsRecord[];
  mxDetected:    boolean;
  mxRecords:     string[];
  mxEvidence:    string[];
  spfDetected:   boolean;
  dmarcDetected: boolean;
  spfRecordCount: number;
  dmarcRecordCount: number;
  spfRecord?:    string;
  dmarcRecord?:  string;
  spfEvidence:   string[];
  dmarcEvidence: string[];
  dnsQueryEvidence: string[];
  emailSecurityConfidence?: "high" | "medium" | "low";
  spfAll?:        string;
  spfLookupCount: number;
  dmarcPolicy?:   string;
  dmarcSubdomainPolicy?: string;
  dmarcPct?:      number;
  dmarcRua?:      string;
  dmarcRuf?:      string;
  dmarcAlignmentDkim?: string;
  dmarcAlignmentSpf?:  string;
  error?:        string;
}

// ── SSL ──────────────────────────────────────

export interface SslResult {
  httpsAvailable:  boolean;
  issuer:          string;
  subject:         string;
  validFrom:       string;
  validTo:         string;
  daysRemaining:   number;
  sanDomains:      string[];
  trusted:         boolean;
  protocol?:       string;
  cipherName?:     string;
  cipherBits?:     number;
  tlsConfidence?:  "high" | "medium" | "low";
  certificateEvidence?: string[];
  warning?:        string;
  error?:          string;
}

// ── HTTP Headers ─────────────────────────────

export type HeaderStatus = "present" | "missing" | "warning";

export interface SecurityHeaderItem {
  header:      string;
  status:      HeaderStatus;
  value?:      string;
  description: string;
  confidence?: "high" | "medium" | "low";
  evidence?:   string[];
}

export interface HeadersResult {
  statusCode:       number;
  finalUrl:         string;
  redirectDetected: boolean;
  server?:          string;
  xPoweredBy?:      string;
  securityHeaders:  SecurityHeaderItem[];
  responseEvidence?: string[];
  error?:           string;
}

export interface RedirectHop {
  fromUrl:    string;
  toUrl:      string;
  statusCode: number;
}

export interface HttpOverviewResult {
  statusCode:     number;
  finalUrl:       string;
  redirectChain:  string[];
  redirectHops:   RedirectHop[];
  redirectCount:  number;
  initialHost?:    string;
  finalHost?:      string;
  finalProtocol?:  string;
  hostChanged:    boolean;
  server?:         string;
  poweredBy?:      string;
  via?:            string;
  cdnProvider?:    string;
  cdnConfidence?:  "high" | "medium" | "low";
  cdnEvidence?:    string[];
  altSvc?:         string;
  contentType?:   string;
  contentLength?: number;
  responseBytes:  number;
  responseTimeMs: number;
  compression?:   string;
  cacheControl?:  string;
  expires?:       string;
  etag?:          string;
  lastModified?:  string;
  error?:         string;
}

export interface PageMetadataResult {
  title?:         string;
  description?:   string;
  canonicalUrl?:  string;
  ogTitle?:       string;
  ogDescription?: string;
  ogImage?:       string;
  faviconUrl?:    string;
  language?:      string;
  robots?:        string;
  noindex:        boolean;
  nofollow:       boolean;
  error?:         string;
}

// ── WHOIS ─────────────────────────────────────

export interface SiteDiscoveryResult {
  robotsPresent:     boolean;
  robotsUrl?:        string;
  robotsStatusCode?: number;
  userAgents:        string[];
  allowRules:        string[];
  disallowRules:     string[];
  crawlDelay?:       string;
  disallowAll:       boolean;
  sitemapPresent:    boolean;
  sitemapUrl?:       string;
  sitemapUrls:       string[];
  sitemapUrlCount:   number;
  sitemapIndexCount: number;
  error?:            string;
}

export interface WhoisResult {
  registrar?:   string;
  createdDate?: string;
  updatedDate?: string;
  expiryDate?:  string;
  nameServers:  string[];
  dnssec?:      string;
  raw?:         string;
  error?:       string;
}

// ── Tech Stack ───────────────────────────────

export type TechCategory =
  | "JavaScript Framework"
  | "CSS Framework"
  | "CDN"
  | "Web Server"
  | "Backend Framework"
  | "CMS"
  | "Analytics"
  | "Hosting"
  | "Database"
  | "Other";

export interface TechStackItem {
  name:       string;
  category:   TechCategory;
  confidence: "high" | "medium" | "low";
  version?:   string;
  sources?:   string[];
  evidence?:  string[];
}

// ── Cookies ──────────────────────────────────

export type EvidenceLevel = "verified" | "observed" | "inferred" | "unavailable" | "error";

export interface EvidenceSummaryItem {
  module:      string;
  label:       string;
  level:       EvidenceLevel;
  detail:      string;
  source:      string;
  confidence?: "high" | "medium" | "low";
  evidence?:   string[];
}

export interface CookieResult {
  name:       string;
  secure:     boolean;
  httpOnly:   boolean;
  sameSite?:  "Strict" | "Lax" | "None" | string;
  expires?:   string;
  maxAge?:    number;
  warnings:   string[];
}

// ── Security.txt ─────────────────────────────

export interface SecurityTxtResult {
  present:    boolean;
  location?:  string;
  contact?:   string;
  policy?:    string;
  encryption?:string;
  expires?:   string;
  raw?:       string;
  error?:     string;
}

// ── Screenshot ───────────────────────────────

export interface ScreenshotResult {
  url?:           string;
  base64?:        string;
  mobileBase64?:  string;
  capturedAt?:    string;
  viewport?:      string;
  mobileViewport?: string;
  error?:         string;
}

// ── Main Report ──────────────────────────────

export interface ScanReport {
  target:        string;
  normalizedUrl: string;
  hostname:      string;
  scanTime:      string;
  score:         number;
  grade:         RiskGrade;
  status:        RiskStatus;
  summary:       string;
  dns:           DnsResult;
  ssl:           SslResult;
  headers:       HeadersResult;
  httpOverview:  HttpOverviewResult;
  pageMetadata:  PageMetadataResult;
  siteDiscovery: SiteDiscoveryResult;
  whois:         WhoisResult;
  techStack:     TechStackItem[];
  cookies:       CookieResult[];
  securityTxt:   SecurityTxtResult;
  screenshot:    ScreenshotResult;
  findings:      Finding[];
  evidenceSummary: EvidenceSummaryItem[];
}

// ── History ───────────────────────────────────

export interface HistoryEntry {
  id:       string;
  domain:   string;
  scanTime: string;
  score:    number;
  grade:    RiskGrade;
  status:   RiskStatus;
  issues:   number;
}

// ── Scan Log ─────────────────────────────────

export interface LogEntry {
  timestamp:   string;
  domain:      string;
  duration_ms: number;
  score:       number;
  grade:       RiskGrade;
  status:      RiskStatus;
  cached:      boolean;
  error?:      string | null;
}

// ── Backend Settings ──────────────────────────

export interface BackendSettings {
  ENABLE_SCREENSHOT:           boolean;
  SCAN_TIMEOUT_SECONDS:        number;
  ANALYZER_TIMEOUT_SECONDS:    number;
  SCREENSHOT_TIMEOUT_SECONDS:  number;
  FETCH_TIMEOUT_SECONDS:       number;
  MAX_HTML_BYTES:              number;
  CORS_ORIGIN:                 string;
  ENV:                         string;
}

// ── API Response ─────────────────────────────

export interface ApiResponse {
  success: boolean;
  data?:   ScanReport;
  error?:  string;
}

export interface HistoryResponse {
  success: boolean;
  data:    HistoryEntry[];
}
