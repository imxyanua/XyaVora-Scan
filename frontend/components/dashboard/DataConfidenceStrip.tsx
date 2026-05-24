import type { ScanReport } from "@/types";

interface Props {
  report: ScanReport;
}

type ConfidenceStatus = "detected" | "partial" | "unavailable" | "error";

interface ModuleStatus {
  label: string;
  status: ConfidenceStatus;
  detail: string;
}

const STATUS_STYLE: Record<ConfidenceStatus, { cls: string; text: string }> = {
  detected: {
    cls: "border-primary-fixed/45 text-primary-fixed bg-primary-fixed/10",
    text: "Detected",
  },
  partial: {
    cls: "border-status-warn/55 text-status-warn bg-status-warn/10",
    text: "Partial",
  },
  unavailable: {
    cls: "border-white/15 text-white/45 bg-white/[0.03]",
    text: "Unavailable",
  },
  error: {
    cls: "border-error/60 text-error bg-error/10",
    text: "Error",
  },
};

function hasAny<T>(items: T[] | undefined) {
  return Boolean(items && items.length > 0);
}

function moduleStatuses(report: ScanReport): ModuleStatus[] {
  return [
    {
      label: "DNS",
      status: report.dns.error ? "error" : hasAny(report.dns.records) ? "detected" : "unavailable",
      detail: report.dns.error
        ? report.dns.error
        : report.dns.emailSecurityConfidence
        ? `${report.dns.records.length} records, email ${report.dns.emailSecurityConfidence}`
        : `${report.dns.records.length} records`,
    },
    {
      label: "DNSSEC",
      status: report.dns.error ? "error" : report.dns.dnssecSigned ? "detected" : "partial",
      detail: report.dns.error
        ? report.dns.error
        : report.dns.dnssecSigned
        ? `DS observed at ${report.dns.dnssecCheckedHost ?? "checked host"}`
        : `No DS observed at ${report.dns.dnssecCheckedHost ?? "checked host"}`,
    },
    {
      label: "TLS",
      status: report.ssl.error ? "error" : report.ssl.httpsAvailable ? "detected" : "unavailable",
      detail: report.ssl.error ? report.ssl.error : report.ssl.httpsAvailable ? "HTTPS available" : "No HTTPS",
    },
    {
      label: "Headers",
      status: report.headers.error ? "error" : hasAny(report.headers.securityHeaders) ? "detected" : "partial",
      detail: report.headers.error ? report.headers.error : `${report.headers.securityHeaders.length} checks`,
    },
    {
      label: "HTTP",
      status: report.httpOverview.error ? "error" : report.httpOverview.statusCode ? "detected" : "unavailable",
      detail: report.httpOverview.error
        ? report.httpOverview.error
        : report.httpOverview.cdnProvider
        ? `${report.httpOverview.statusCode} status, ${report.httpOverview.cdnProvider} CDN (${report.httpOverview.cdnConfidence ?? "unknown"})`
        : `${report.httpOverview.statusCode || "No"} status`,
    },
    {
      label: "WHOIS",
      status: report.whois.error ? "error" : report.whois.registrar || hasAny(report.whois.nameServers) ? "detected" : "partial",
      detail: report.whois.error ? report.whois.error : report.whois.registrar || "Registrar unknown",
    },
    {
      label: "Page",
      status: report.pageMetadata.error ? "error" : report.pageMetadata.title || report.pageMetadata.description ? "detected" : "partial",
      detail: report.pageMetadata.error ? report.pageMetadata.error : report.pageMetadata.title ? "Metadata found" : "Limited metadata",
    },
    {
      label: "Discovery",
      status: report.siteDiscovery.error ? "error" : report.siteDiscovery.robotsPresent || report.siteDiscovery.sitemapPresent ? "detected" : "partial",
      detail: report.siteDiscovery.error ? report.siteDiscovery.error : report.siteDiscovery.sitemapPresent ? "Sitemap found" : "Limited crawl hints",
    },
    {
      label: "Screenshot",
      status: report.screenshot.error ? "error" : report.screenshot.base64 ? "detected" : "unavailable",
      detail: report.screenshot.error ? report.screenshot.error : report.screenshot.base64 ? "Captured" : "No capture",
    },
  ];
}

export function DataConfidenceStrip({ report }: Props) {
  const modules = moduleStatuses(report);

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-4">
        <div>
          <h2 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
            Data Confidence
          </h2>
          <p className="font-mono text-xs text-[#d7e8ff]/70 mt-2">
            Shows whether each scanner module returned complete, partial, unavailable, or error data.
          </p>
        </div>
        <span className="font-mono text-[11px] text-white/70">[MODULES:{modules.length}]</span>
      </div>

      <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,9.5rem),1fr))]">
        {modules.map((module) => {
          const style = STATUS_STYLE[module.status];
          return (
            <div key={module.label} className="border border-primary-fixed/15 bg-[#151918] p-3 min-w-0">
              <div className="font-mono text-sm text-white font-bold truncate">
                {module.label}
              </div>
              <div className={`mt-2 inline-flex font-mono text-[10px] border px-2 py-0.5 ${style.cls}`}>
                {style.text}
              </div>
              <p className="mt-2 font-mono text-[10px] text-[#d7e8ff]/60 truncate" title={module.detail}>
                {module.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
