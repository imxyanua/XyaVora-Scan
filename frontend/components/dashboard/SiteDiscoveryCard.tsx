import type { SiteDiscoveryResult } from "@/types";
import { DetailPanel } from "./DetailPanel";

type Props = {
  discovery: SiteDiscoveryResult;
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`status-badge ${ok ? "status-pass" : "status-missing"} text-[10px]`}>
      {ok ? `[${label}]` : `[-] ${label}`}
    </span>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  const displayValue = value ? String(value) : "Unknown";

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-1.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="font-mono text-sm text-white font-bold shrink-0">
        {label}
      </span>
      <span className="min-w-0 max-w-[68%] truncate text-right font-mono text-sm text-white" title={displayValue}>
        {displayValue}
      </span>
    </div>
  );
}

export function SiteDiscoveryCard({ discovery }: Props) {
  const topAgents = discovery.userAgents.slice(0, 4).join(", ");
  const topSitemaps = discovery.sitemapUrls.slice(0, 4);
  const ruleCount = discovery.allowRules.length + discovery.disallowRules.length;
  const detailItems = [
    { label: "robots.txt Present", value: discovery.robotsPresent },
    { label: "robots.txt URL", value: discovery.robotsUrl },
    { label: "robots.txt Status", value: discovery.robotsStatusCode },
    { label: "User Agents", value: discovery.userAgents.join("\n") },
    { label: "Allow Rules", value: discovery.allowRules.join("\n") },
    { label: "Disallow Rules", value: discovery.disallowRules.join("\n") },
    { label: "Crawl Delay", value: discovery.crawlDelay },
    { label: "Disallow All", value: discovery.disallowAll },
    { label: "Sitemap Present", value: discovery.sitemapPresent },
    { label: "Sitemap URL", value: discovery.sitemapUrl },
    { label: "Sitemap URLs", value: discovery.sitemapUrls.join("\n") },
    { label: "robots.txt Evidence", value: discovery.robotsEvidence?.join("\n") },
    { label: "Sitemap Evidence", value: discovery.sitemapEvidence?.join("\n") },
    { label: "Discovery Evidence", value: discovery.discoveryEvidence?.join("\n") },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Site Discovery
        </h3>
        <div className="flex items-center gap-2 pt-0.5">
          <StatusPill ok={discovery.robotsPresent} label="ROBOTS" />
          <StatusPill ok={discovery.sitemapPresent} label="SITEMAP" />
        </div>
      </div>

      {discovery.error ? (
        <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {discovery.error}</p>
      ) : (
        <>
          <div className="flex-1 overflow-hidden">
            <Row label="robots.txt" value={discovery.robotsUrl ?? discovery.robotsStatusCode} />
            <Row label="User Agents" value={topAgents} />
            <Row label="Rules" value={ruleCount} />
            <Row label="Crawl Delay" value={discovery.crawlDelay} />
            <Row label="Disallow All" value={discovery.disallowAll ? "YES" : "NO"} />
            <Row label="Sitemap" value={discovery.sitemapUrl} />
            <Row label="Sitemap URLs" value={discovery.sitemapUrlCount} />
            <Row label="Nested Sitemaps" value={discovery.sitemapIndexCount} />
          </div>

          {topSitemaps.length > 0 && (
            <div className="border-t border-primary-fixed/10 bg-[#151918] px-5 py-3">
              <p className="font-mono text-sm text-white font-bold mb-2">
                Sitemap Samples
              </p>
              <div className="space-y-1">
                {topSitemaps.map((url) => (
                  <p key={url} className="font-mono text-[10px] text-[#d7e8ff]/70 truncate">
                    {url}
                  </p>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {!discovery.error && <DetailPanel items={detailItems} />}
    </div>
  );
}
