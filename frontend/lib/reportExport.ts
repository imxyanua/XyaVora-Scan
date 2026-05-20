import type { Finding, ScanReport, TechStackItem } from "@/types";

function valueOrUnknown(value?: string | number | boolean | null) {
  if (value === undefined || value === null || value === "") return "Unknown";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function escapeCell(value?: string | number | boolean | null) {
  return valueOrUnknown(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function table(rows: Array<[string, string | number | boolean | null | undefined]>) {
  return [
    "| Field | Value |",
    "|---|---|",
    ...rows.map(([label, value]) => `| ${escapeCell(label)} | ${escapeCell(value)} |`),
  ].join("\n");
}

function listItems(items: string[] | undefined, empty = "None observed") {
  if (!items || items.length === 0) return `- ${empty}`;
  return items.map((item) => `- ${item}`).join("\n");
}

function summarizeFindings(findings: Finding[]) {
  const actionable = findings.filter((finding) => finding.status === "fail" || finding.status === "warning");
  if (actionable.length === 0) return "- No failed or review findings in the current rule set.";

  return actionable
    .slice(0, 12)
    .map((finding) => [
      `- **${finding.title}**`,
      `  - Status: ${finding.status}`,
      `  - Severity: ${finding.severity}`,
      `  - Category: ${finding.category}`,
      `  - Confidence: ${finding.confidence ?? "Unknown"}`,
      `  - Source: ${finding.source ?? "Unknown"}`,
      `  - Recommendation: ${finding.recommendation}`,
      finding.evidence?.length ? `  - Evidence: ${finding.evidence.slice(0, 3).join(" | ")}` : null,
    ].filter(Boolean).join("\n"))
    .join("\n");
}

function summarizeTechStack(items: TechStackItem[]) {
  if (items.length === 0) return "- No technologies detected.";

  return items
    .map((item) => {
      const suffix = item.version ? ` ${item.version}` : "";
      const sources = item.sources?.length ? item.sources.join(" + ") : "unknown source";
      return `- **${item.name}${suffix}** (${item.category}, ${item.confidence}, ${sources})`;
    })
    .join("\n");
}

function screenshotStatus(report: ScanReport) {
  if (report.screenshot.error) return `Error: ${report.screenshot.error}`;
  if (report.screenshot.base64 && report.screenshot.mobileBase64) return "Desktop and mobile captured";
  if (report.screenshot.base64) return "Desktop captured";
  return "Not captured";
}

export function makeReportFileName(hostname: string, extension: "json" | "md") {
  const safeHost = hostname.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${safeHost || "scan"}-${stamp}.${extension}`;
}

export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function generateMarkdownReport(report: ScanReport) {
  const hostname = report.hostname || report.target;
  const generatedAt = new Date().toISOString();
  const missingHeaders = report.headers.securityHeaders.filter((item) => item.status === "missing").length;
  const weakHeaders = report.headers.securityHeaders.filter((item) => item.status === "warning").length;

  return [
    `# XyaVora-Scan Report: ${hostname}`,
    "",
    `Generated: ${generatedAt}`,
    `Scan time: ${report.scanTime}`,
    "",
    "> This report is passive reconnaissance output. Findings are posture observations, not confirmed exploitable vulnerabilities.",
    "",
    "## Overview",
    "",
    table([
      ["Target", report.target],
      ["Normalized URL", report.normalizedUrl],
      ["Hostname", report.hostname],
      ["Score", `${report.score}/100`],
      ["Grade", report.grade],
      ["Risk Status", report.status],
      ["Summary", report.summary],
    ]),
    "",
    "## Priority Findings",
    "",
    summarizeFindings(report.findings),
    "",
    "## Evidence Quality",
    "",
    table([
      ["DNS records", report.dns.error ? `Error: ${report.dns.error}` : report.dns.records.length],
      ["TLS", report.ssl.error ? `Error: ${report.ssl.error}` : report.ssl.httpsAvailable ? `${report.ssl.protocol ?? "TLS"} available` : "Unavailable"],
      ["Headers", report.headers.error ? `Error: ${report.headers.error}` : `${report.headers.securityHeaders.length} checked, ${missingHeaders} missing, ${weakHeaders} weak`],
      ["HTTP", report.httpOverview.error ? `Error: ${report.httpOverview.error}` : `${report.httpOverview.statusCode} final status`],
      ["Tech stack", `${report.techStack.length} fingerprints`],
      ["Screenshot", screenshotStatus(report)],
    ]),
    "",
    "## TLS / SSL",
    "",
    table([
      ["HTTPS Available", report.ssl.httpsAvailable],
      ["Trusted", report.ssl.trusted],
      ["Issuer", report.ssl.issuer],
      ["Subject", report.ssl.subject],
      ["Valid From", report.ssl.validFrom],
      ["Valid To", report.ssl.validTo],
      ["Days Remaining", report.ssl.daysRemaining],
      ["Protocol", report.ssl.protocol],
      ["Cipher", report.ssl.cipherName],
      ["Cipher Bits", report.ssl.cipherBits],
    ]),
    "",
    "## HTTP Overview",
    "",
    table([
      ["Status Code", report.httpOverview.statusCode],
      ["Final URL", report.httpOverview.finalUrl],
      ["Redirect Count", report.httpOverview.redirectCount],
      ["Initial Host", report.httpOverview.initialHost],
      ["Final Host", report.httpOverview.finalHost],
      ["Host Changed", report.httpOverview.hostChanged],
      ["Content Type", report.httpOverview.contentType],
      ["Response Time", report.httpOverview.responseTimeMs ? `${report.httpOverview.responseTimeMs}ms` : undefined],
      ["CDN Provider", report.httpOverview.cdnProvider],
      ["CDN Confidence", report.httpOverview.cdnConfidence],
    ]),
    "",
    "## DNS And Email",
    "",
    table([
      ["Record Count", report.dns.records.length],
      ["MX Detected", report.dns.mxDetected],
      ["SPF Detected", report.dns.spfDetected],
      ["SPF Policy", report.dns.spfAll ? `${report.dns.spfAll}all` : undefined],
      ["DMARC Detected", report.dns.dmarcDetected],
      ["DMARC Policy", report.dns.dmarcPolicy],
      ["Email Confidence", report.dns.emailSecurityConfidence],
    ]),
    "",
    "## Tech Stack",
    "",
    summarizeTechStack(report.techStack),
    "",
    "## Page Metadata",
    "",
    table([
      ["Title", report.pageMetadata.title],
      ["Description", report.pageMetadata.description],
      ["Canonical URL", report.pageMetadata.canonicalUrl],
      ["Language", report.pageMetadata.language],
      ["Robots", report.pageMetadata.robots],
      ["Noindex", report.pageMetadata.noindex],
      ["Nofollow", report.pageMetadata.nofollow],
    ]),
    "",
    "## Security Headers",
    "",
    ...report.headers.securityHeaders.map((header) => [
      `### ${header.header}`,
      "",
      table([
        ["Status", header.status],
        ["Confidence", header.confidence],
        ["Value", header.value],
        ["Description", header.description],
      ]),
      "",
      header.evidence?.length ? listItems(header.evidence) : "- No evidence recorded",
      "",
    ].join("\n")),
    "## Raw Evidence Notes",
    "",
    "- Screenshot base64 is intentionally omitted from Markdown export.",
    "- Download JSON for the complete structured payload.",
  ].join("\n");
}
