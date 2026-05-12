// MOCK DATA — not real scan results
// Target: google.com | Used for UI development only

import type { ScanReport } from "@/types";

export const mockGoogleReport: ScanReport = {
  target:        "google.com",
  normalizedUrl: "https://google.com",
  hostname:      "google.com",
  scanTime:      "2026-05-12T10:42:00.000Z",
  score:         82,
  grade:         "B",
  status:        "Medium Risk",
  summary:
    "The domain has a valid SSL certificate and basic DNS configuration, but several critical security headers are missing, increasing the attack surface.",

  dns: {
    records: [
      { type: "A",    host: "google.com", value: "142.250.190.78",           ttl: 300  },
      { type: "AAAA", host: "google.com", value: "2607:f8b0:4005:805::200e", ttl: 300  },
      { type: "MX",   host: "google.com", value: "smtp.google.com",          ttl: 3600 },
      { type: "NS",   host: "google.com", value: "ns1.google.com",           ttl: 21600 },
      { type: "NS",   host: "google.com", value: "ns2.google.com",           ttl: 21600 },
      { type: "TXT",  host: "google.com", value: "v=spf1 include:_spf.google.com ~all", ttl: 3600 },
      { type: "TXT",  host: "_dmarc.google.com", value: "v=DMARC1; p=none; rua=mailto:mailauth-reports@google.com", ttl: 3600 },
    ],
    spfDetected:   true,
    dmarcDetected: true,
    spfRecord:     "v=spf1 include:_spf.google.com ~all",
    dmarcRecord:   "v=DMARC1; p=none; rua=mailto:mailauth-reports@google.com",
  },

  ssl: {
    httpsAvailable: true,
    issuer:         "Google Trust Services",
    subject:        "*.google.com",
    validFrom:      "2026-03-18T00:00:00.000Z",
    validTo:        "2026-07-13T00:00:00.000Z",
    daysRemaining:  62,
    sanDomains:     ["*.google.com", "google.com"],
    trusted:        true,
    protocol:       "TLS 1.3",
  },

  headers: {
    statusCode:       200,
    finalUrl:         "https://www.google.com/",
    redirectDetected: true,
    server:           "gws",
    xPoweredBy:       undefined,
    securityHeaders: [
      {
        header:      "Strict-Transport-Security",
        status:      "missing",
        description: "Enforces HTTPS connections and prevents downgrade attacks.",
      },
      {
        header:      "Content-Security-Policy",
        status:      "missing",
        description: "Prevents XSS attacks by controlling allowed content sources.",
      },
      {
        header:      "X-Frame-Options",
        status:      "present",
        value:       "SAMEORIGIN",
        description: "Prevents clickjacking by restricting iframe embedding.",
      },
      {
        header:      "X-Content-Type-Options",
        status:      "present",
        value:       "nosniff",
        description: "Prevents MIME type sniffing attacks.",
      },
      {
        header:      "Referrer-Policy",
        status:      "present",
        value:       "strict-origin-when-cross-origin",
        description: "Controls how much referrer information is shared.",
      },
      {
        header:      "Permissions-Policy",
        status:      "missing",
        description: "Controls access to browser features like camera and microphone.",
      },
    ],
  },

  whois: {
    registrar:   "MarkMonitor Inc.",
    createdDate: "1997-09-15T00:00:00.000Z",
    updatedDate: "2019-09-09T00:00:00.000Z",
    expiryDate:  "2028-09-14T00:00:00.000Z",
    nameServers: ["ns1.google.com", "ns2.google.com", "ns3.google.com", "ns4.google.com"],
    dnssec:      "unsigned",
  },

  techStack: [
    { name: "React",            category: "JavaScript Framework", confidence: "high" },
    { name: "Next.js",          category: "JavaScript Framework", confidence: "medium" },
    { name: "Cloudflare",       category: "CDN",                  confidence: "high" },
    { name: "Nginx",            category: "Web Server",           confidence: "high" },
    { name: "Google Analytics", category: "Analytics",            confidence: "high" },
    { name: "Vercel",           category: "Hosting",              confidence: "low"  },
  ],

  cookies: [
    {
      name:     "NID",
      secure:   true,
      httpOnly: true,
      sameSite: "None",
      expires:  "2026-11-12T10:42:00.000Z",
      warnings: [],
    },
    {
      name:     "__Secure-1PSID",
      secure:   true,
      httpOnly: false,
      sameSite: "Lax",
      warnings: ["httpOnly flag is missing — cookie accessible via JavaScript"],
    },
    {
      name:     "CONSENT",
      secure:   false,
      httpOnly: false,
      sameSite: undefined,
      warnings: [
        "Secure flag is missing",
        "httpOnly flag is missing",
        "SameSite attribute is not set",
      ],
    },
  ],

  securityTxt: {
    present:  false,
    error:    "security.txt not found at /.well-known/security.txt or /security.txt",
  },

  screenshot: {
    error: "Screenshot capture not available in mock mode.",
  },

  findings: [
    {
      id:             "f-001",
      severity:       "high",
      category:       "Headers",
      title:          "Missing Content-Security-Policy Header",
      description:    "The Content-Security-Policy header is not set, leaving the site vulnerable to Cross-Site Scripting (XSS) and data injection attacks.",
      impact:         "Attackers can inject malicious scripts that execute in users' browsers.",
      recommendation: "Add a Content-Security-Policy header with appropriate directives. Start with 'default-src \\'self\\'' and expand as needed.",
      status:         "fail",
    },
    {
      id:             "f-002",
      severity:       "high",
      category:       "Headers",
      title:          "Missing Strict-Transport-Security (HSTS) Header",
      description:    "HSTS is not enforced. The site may be vulnerable to SSL stripping and protocol downgrade attacks.",
      impact:         "Attackers on the same network could intercept traffic by downgrading HTTPS to HTTP.",
      recommendation: "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' header.",
      status:         "fail",
    },
    {
      id:             "f-003",
      severity:       "medium",
      category:       "Headers",
      title:          "Missing Permissions-Policy Header",
      description:    "The Permissions-Policy header is not set, which means browser features are not explicitly restricted.",
      impact:         "Third-party scripts could access sensitive browser APIs without restriction.",
      recommendation: "Add a Permissions-Policy header to restrict access to camera, microphone, geolocation, etc.",
      status:         "warning",
    },
    {
      id:             "f-004",
      severity:       "medium",
      category:       "DNS",
      title:          "DMARC Policy Not Strict",
      description:    "The DMARC record uses 'p=none', which means no enforcement action is taken on failed authentication.",
      impact:         "Domain can be used for email spoofing without consequence.",
      recommendation: "Change DMARC policy to 'p=quarantine' or 'p=reject' for stronger protection.",
      status:         "warning",
    },
    {
      id:             "f-005",
      severity:       "low",
      category:       "Headers",
      title:          "Server Header Exposes Technology",
      description:    "The Server header reveals the web server software: 'gws'. This information can assist attackers in targeting known vulnerabilities.",
      impact:         "Minor information disclosure that assists fingerprinting.",
      recommendation: "Configure the server to suppress or obfuscate the Server header.",
      status:         "warning",
    },
    {
      id:             "f-006",
      severity:       "medium",
      category:       "Cookies",
      title:          "Cookie Missing Security Flags",
      description:    "The 'CONSENT' cookie is missing Secure, HttpOnly, and SameSite attributes.",
      impact:         "Cookie may be transmitted over HTTP and accessible via JavaScript, risking session hijacking.",
      recommendation: "Set Secure, HttpOnly, and SameSite=Lax (or Strict) attributes on all sensitive cookies.",
      status:         "warning",
    },
    {
      id:             "f-007",
      severity:       "info",
      category:       "Security.txt",
      title:          "security.txt Not Found",
      description:    "No security.txt file was found at /.well-known/security.txt or /security.txt.",
      recommendation: "Add a security.txt file following RFC 9116 to help security researchers report vulnerabilities responsibly.",
      status:         "info",
    },
    {
      id:             "f-008",
      severity:       "info",
      category:       "SSL",
      title:          "SSL Certificate Is Valid",
      description:    "The SSL certificate is valid, trusted, and uses TLS 1.3.",
      recommendation: "No action required. Monitor expiration date.",
      status:         "pass",
    },
    {
      id:             "f-009",
      severity:       "info",
      category:       "DNS",
      title:          "SPF Record Detected",
      description:    "A valid SPF record was found: 'v=spf1 include:_spf.google.com ~all'.",
      recommendation: "No action required. Consider using '~all' vs '-all' based on your mail flow.",
      status:         "pass",
    },
    {
      id:             "f-010",
      severity:       "info",
      category:       "DNS",
      title:          "DNS Records Resolved Successfully",
      description:    "A, AAAA, MX, NS, and TXT records were all resolved successfully.",
      recommendation: "No action required.",
      status:         "pass",
    },
  ],
};
