import type { EvidenceSummaryItem, ScanReport, TechStackItem } from "@/types";

type QualityGroup = "verified" | "observed" | "inferred";

type QualityItem = {
  label: string;
  detail: string;
};

const GROUP_STYLE: Record<QualityGroup, { title: string; tag: string; cls: string }> = {
  verified: {
    title: "Verified",
    tag: "DIRECT",
    cls: "border-primary-fixed/45 text-primary-fixed bg-primary-fixed/10",
  },
  observed: {
    title: "Observed",
    tag: "SEEN",
    cls: "border-secondary-fixed/45 text-secondary-fixed bg-secondary-fixed/10",
  },
  inferred: {
    title: "Inferred",
    tag: "HEURISTIC",
    cls: "border-status-warn/55 text-status-warn bg-status-warn/10",
  },
};

function hasAssetOnlySignal(item: TechStackItem) {
  const sources = item.sources ?? [];
  return sources.length > 0 && sources.every((source) => source === "asset-url" || source === "asset-body");
}

function groupsFromEvidenceSummary(items: EvidenceSummaryItem[]): Record<QualityGroup, QualityItem[]> {
  return items.reduce<Record<QualityGroup, QualityItem[]>>(
    (groups, item) => {
      if (item.level === "verified" || item.level === "observed" || item.level === "inferred") {
        groups[item.level].push({
          label: item.label,
          detail: item.confidence ? `${item.detail} (${item.confidence} confidence)` : item.detail,
        });
      }
      return groups;
    },
    { verified: [], observed: [], inferred: [] },
  );
}

function qualityGroups(report: ScanReport): Record<QualityGroup, QualityItem[]> {
  if (report.evidenceSummary?.length) {
    return groupsFromEvidenceSummary(report.evidenceSummary);
  }

  const verified: QualityItem[] = [];
  const observed: QualityItem[] = [];
  const inferred: QualityItem[] = [];

  if (!report.dns.error && report.dns.records.length > 0) {
    verified.push({ label: "DNS", detail: `${report.dns.records.length} records resolved` });
  }

  if (!report.ssl.error && report.ssl.httpsAvailable) {
    verified.push({
      label: "TLS",
      detail: `${report.ssl.protocol ?? "TLS"} certificate, ${report.ssl.daysRemaining} days left`,
    });
  }

  if (!report.headers.error && report.headers.securityHeaders.length > 0) {
    verified.push({ label: "Headers", detail: `${report.headers.securityHeaders.length} response header checks` });
  }

  if (!report.httpOverview.error && report.httpOverview.statusCode) {
    observed.push({ label: "HTTP", detail: `${report.httpOverview.statusCode} final response` });
  }

  if (!report.whois.error && (report.whois.registrar || report.whois.nameServers.length > 0)) {
    observed.push({ label: "WHOIS", detail: report.whois.registrar ?? `${report.whois.nameServers.length} name servers` });
  }

  if (!report.pageMetadata.error && (report.pageMetadata.title || report.pageMetadata.description)) {
    observed.push({ label: "Page metadata", detail: report.pageMetadata.title ? "Title detected" : "Description detected" });
  }

  if (report.cookies.length > 0) {
    observed.push({ label: "Cookies", detail: `${report.cookies.length} Set-Cookie values observed` });
  }

  if (!report.securityTxt.error && report.securityTxt.present) {
    observed.push({ label: "security.txt", detail: "Published disclosure file observed" });
  }

  if (!report.siteDiscovery.error && (report.siteDiscovery.robotsPresent || report.siteDiscovery.sitemapPresent)) {
    observed.push({
      label: "Crawl hints",
      detail: report.siteDiscovery.sitemapPresent ? "Sitemap found" : "robots.txt found",
    });
  }

  if (report.screenshot.base64 || report.screenshot.mobileBase64) {
    observed.push({ label: "Screenshot", detail: report.screenshot.mobileBase64 ? "Desktop and mobile capture" : "Desktop capture" });
  }

  if (report.httpOverview.cdnProvider) {
    const item = {
      label: "CDN",
      detail: `${report.httpOverview.cdnProvider} (${report.httpOverview.cdnConfidence ?? "unknown"} confidence)`,
    };
    if (report.httpOverview.cdnConfidence === "high") verified.push(item);
    else inferred.push(item);
  }

  const lowConfidenceTech = report.techStack.filter(
    (item) => item.confidence === "low" || item.sources?.includes("inferred") || hasAssetOnlySignal(item),
  );
  const directTech = report.techStack.filter((item) => !lowConfidenceTech.includes(item));

  if (directTech.length > 0) {
    observed.push({ label: "Tech stack", detail: `${directTech.length} direct page/header fingerprints` });
  }

  if (lowConfidenceTech.length > 0) {
    inferred.push({ label: "Tech stack", detail: `${lowConfidenceTech.length} heuristic or low-confidence fingerprints` });
  }

  const bestPracticeFindings = report.findings.filter((finding) => finding.confidence === "best-practice").length;
  if (bestPracticeFindings > 0) {
    inferred.push({ label: "Best practices", detail: `${bestPracticeFindings} posture observations` });
  }

  return { verified, observed, inferred };
}

function QualityColumn({ group, items }: { group: QualityGroup; items: QualityItem[] }) {
  const style = GROUP_STYLE[group];

  return (
    <div className="border border-primary-fixed/15 bg-[#151918] p-4 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-lg font-bold leading-none text-white">
            {style.title}
          </h3>
          <p className="mt-1 font-mono text-[11px] text-[#d7e8ff]/55">
            {items.length} signal{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <span className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] leading-none ${style.cls}`}>
          {style.tag}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="font-mono text-xs text-white/40">No data in this group.</p>
        ) : (
          items.slice(0, 5).map((item) => (
            <div key={`${item.label}:${item.detail}`} className="border-l border-primary-fixed/20 pl-3">
              <p className="font-mono text-sm font-bold text-white">
                {item.label}
              </p>
              <p className="mt-0.5 truncate font-mono text-xs text-[#d7e8ff]/65" title={item.detail}>
                {item.detail}
              </p>
            </div>
          ))
        )}
        {items.length > 5 && (
          <p className="font-mono text-[11px] text-primary-fixed/55">
            + {items.length - 5} more signals
          </p>
        )}
      </div>
    </div>
  );
}

export function ReportQualitySummary({ report }: { report: ScanReport }) {
  const groups = qualityGroups(report);

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-4">
        <div>
          <h2 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
            Report Quality Summary
          </h2>
          <p className="font-mono text-[13px] text-[#d7e8ff]/70 mt-2 max-w-3xl leading-relaxed">
            Separates direct technical evidence from observed page data and heuristic fingerprints.
          </p>
        </div>
        <span className="font-mono text-[11px] text-white/70">[EVIDENCE_MODEL]</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <QualityColumn group="verified" items={groups.verified} />
        <QualityColumn group="observed" items={groups.observed} />
        <QualityColumn group="inferred" items={groups.inferred} />
      </div>
    </div>
  );
}
