// ─────────────────────────────────────────────
//  XyaVora-Scan — Shared Types
//  Must stay in sync with backend types/report.ts
// ─────────────────────────────────────────────

// ── Core enums ───────────────────────────────

export type FindingSeverity = "info" | "low" | "medium" | "high";
export type FindingStatus   = "pass" | "warning" | "fail" | "info";
export type FindingCategory =
  | "DNS"
  | "SSL"
  | "Headers"
  | "WHOIS"
  | "Tech Stack"
  | "Cookies"
  | "Security.txt"
  | "Screenshot"
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
  spfDetected:   boolean;
  dmarcDetected: boolean;
  spfRecord?:    string;
  dmarcRecord?:  string;
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
}

export interface HeadersResult {
  statusCode:       number;
  finalUrl:         string;
  redirectDetected: boolean;
  server?:          string;
  xPoweredBy?:      string;
  securityHeaders:  SecurityHeaderItem[];
  error?:           string;
}

// ── WHOIS ─────────────────────────────────────

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
}

// ── Cookies ──────────────────────────────────

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
  whois:         WhoisResult;
  techStack:     TechStackItem[];
  cookies:       CookieResult[];
  securityTxt:   SecurityTxtResult;
  screenshot:    ScreenshotResult;
  findings:      Finding[];
}

// ── API Response ─────────────────────────────

export interface ApiResponse {
  success: boolean;
  data?:   ScanReport;
  error?:  string;
}
