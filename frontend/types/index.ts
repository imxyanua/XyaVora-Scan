// ─────────────────────────────────────────────
//  XyaVora-Scan — Shared Types
//  Must stay in sync with backend types/report.ts
// ─────────────────────────────────────────────

// ── Core enums ───────────────────────────────

export type FindingSeverity = "info" | "low" | "medium" | "high";
export type FindingStatus   = "pass" | "warning" | "fail" | "info";
export type FindingConfidence = "verified" | "observed" | "inferred" | "best-practice";
export type FindingSource = "dns" | "tls" | "headers" | "http" | "html" | "cookie" | "whois" | "scanner";
export type FindingClassification =
  | "verified-issue"
  | "observed-risk"
  | "hardening-recommendation"
  | "investigation-lead"
  | "informational";
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
  analysis?:      string;
  verification?:  string;
  classification?: FindingClassification;
}

// ── DNS ──────────────────────────────────────

export interface DnsRecord {
  type:  "A" | "AAAA" | "MX" | "NS" | "TXT" | "CNAME" | "SOA" | "DS" | "DNSKEY";
  host:  string;
  value: string;
  ttl?:  number;
}

export interface DnsResult {
  records:       DnsRecord[];
  mxDetected:    boolean;
  mxRecords:     string[];
  mxProviders?:   string[];
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
  spfIncludes?:   string[];
  spfRedirect?:   string;
  spfMechanisms?: string[];
  dmarcPolicy?:   string;
  dmarcSubdomainPolicy?: string;
  dmarcPct?:      number;
  dmarcRua?:      string;
  dmarcRuf?:      string;
  dmarcReportingEnabled?: boolean;
  dmarcForensicReportingEnabled?: boolean;
  dmarcEnforcement?: string;
  dmarcAlignmentDkim?: string;
  dmarcAlignmentSpf?:  string;
  dkimSelectorsChecked?: string[];
  dkimSelectorsFound?: string[];
  dkimRecords?:   string[];
  dkimEvidence?:  string[];
  dnssecCheckedHost?: string;
  dnssecSigned?:    boolean;
  dnssecDsRecords?: string[];
  dnssecDnskeyRecords?: string[];
  dnssecEvidence?: string[];
  dnssecConfidence?: "high" | "medium" | "low";
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
  fromHost?:   string;
  toHost?:     string;
  fromProtocol?: string;
  toProtocol?:   string;
  hostChanged?:  boolean;
  protocolChanged?: boolean;
}

export interface HttpOverviewResult {
  statusCode:     number;
  finalUrl:       string;
  redirectChain:  string[];
  redirectHops:   RedirectHop[];
  redirectCount:  number;
  initialHost?:    string;
  finalHost?:      string;
  initialProtocol?: string;
  finalProtocol?:  string;
  hostChanged:    boolean;
  crossHostRedirect?: boolean;
  upgradedToHttps?: boolean;
  downgradedFromHttps?: boolean;
  canonicalRedirectType?: string;
  redirectSummary?: string;
  server?:         string;
  poweredBy?:      string;
  via?:            string;
  cdnProvider?:    string;
  cdnConfidence?:  "high" | "medium" | "low";
  cdnEvidence?:    string[];
  altSvc?:         string;
  contentType?:   string;
  contentFamily?: string;
  contentLength?: number;
  responseBytes:  number;
  responseTruncated?: boolean;
  responseTimeMs: number;
  compression?:   string;
  cacheControl?:  string;
  cachePolicy?:    string;
  expires?:       string;
  etag?:          string;
  lastModified?:  string;
  responseEvidence?: string[];
  error?:         string;
}

export interface ServerLocationResult {
  ip?:               string;
  resolvedIp?:       string;
  city?:             string;
  region?:           string;
  postal?:           string;
  country?:          string;
  countryCode?:      string;
  timezone?:         string;
  languages:         string[];
  currency?:         string;
  currencyCode?:     string;
  latitude?:         number;
  longitude?:        number;
  organization?:     string;
  isp?:              string;
  asn?:              number;
  source?:           string;
  locationConfidence?: "high" | "medium" | "low";
  networkRole?:      string;
  networkProvider?:  string;
  accuracyNote?:     string;
  networkEvidence:   string[];
  locationEvidence:  string[];
  error?:            string;
}

export interface PageMetadataResult {
  title?:         string;
  description?:   string;
  canonicalUrl?:  string;
  ogTitle?:       string;
  ogDescription?: string;
  ogImage?:       string;
  ogUrl?:         string;
  twitterTitle?:  string;
  twitterDescription?: string;
  twitterImage?:  string;
  faviconUrl?:    string;
  language?:      string;
  robots?:        string;
  robotsDirectives: string[];
  canonicalHost?: string;
  canonicalMatchesFinalHost?: boolean;
  titleLength?:    number;
  descriptionLength?: number;
  socialTagsPresent?: boolean;
  socialImagePresent?: boolean;
  metadataQuality?: "high" | "medium" | "low";
  metadataIssues?: string[];
  metadataEvidence: string[];
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
  robotsEvidence:    string[];
  sitemapEvidence:   string[];
  discoveryEvidence: string[];
  error?:            string;
}

export interface WhoisResult {
  registrar?:   string;
  createdDate?: string;
  updatedDate?: string;
  expiryDate?:  string;
  expiryDaysRemaining?: number;
  nameServers:  string[];
  dnssec?:      string;
  whoisEvidence: string[];
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
  confidenceReason?: string;
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

export interface ScoreBreakdownItem {
  findingId:         string;
  title:             string;
  category:          FindingCategory;
  status:            FindingStatus;
  confidence:        FindingConfidence;
  classification?:   FindingClassification;
  group:             string;
  groupCap:          number;
  baseDeduction:     number;
  confidenceWeight:  number;
  weightedDeduction: number;
  appliedDeduction:  number;
  reason:            string;
}

export interface ScoreGroupBreakdown {
  group:            string;
  cap:              number;
  rawDeduction:     number;
  appliedDeduction: number;
}

export interface CookieResult {
  name:       string;
  secure:     boolean;
  httpOnly:   boolean;
  sameSite?:  "Strict" | "Lax" | "None" | string;
  expires?:   string;
  maxAge?:    number;
  warnings:   string[];
  evidence?:  string[];
}

// ── Security.txt ─────────────────────────────

export interface SecurityTxtResult {
  present:    boolean;
  location?:  string;
  checkedLocations: string[];
  contact?:   string;
  policy?:    string;
  encryption?:string;
  expires?:   string;
  expired:    boolean;
  securityTxtEvidence: string[];
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
  serverLocation: ServerLocationResult;
  pageMetadata:  PageMetadataResult;
  siteDiscovery: SiteDiscoveryResult;
  whois:         WhoisResult;
  techStack:     TechStackItem[];
  cookies:       CookieResult[];
  securityTxt:   SecurityTxtResult;
  screenshot:    ScreenshotResult;
  findings:      Finding[];
  evidenceSummary: EvidenceSummaryItem[];
  scoreBreakdown: ScoreBreakdownItem[];
  scoreGroups:    ScoreGroupBreakdown[];
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

export type ScanJobState = "queued" | "running" | "completed" | "failed";
export type ScanJobStepState = "pending" | "running" | "success" | "error";

export interface ScanJobStep {
  key: string;
  label: string;
  status: ScanJobStepState;
  duration_ms?: number;
  error?: string;
  data?: unknown;
}

export interface ScanJobSnapshot {
  job_id: string;
  target: string;
  hostname: string;
  normalized_url: string;
  status: ScanJobState;
  progress: number;
  created_at: string;
  updated_at: string;
  elapsed_ms: number;
  steps: ScanJobStep[];
  report?: ScanReport;
  error?: string;
}

export interface ScanJobResponse {
  success: boolean;
  data?: ScanJobSnapshot;
  error?: string;
}

export interface HistoryResponse {
  success: boolean;
  data:    HistoryEntry[];
}
