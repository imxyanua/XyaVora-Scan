import type { SiteDiscoveryResult } from "@/types";

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
  return (
    <div className="flex justify-between gap-4 px-5 py-1.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="font-mono text-sm text-white font-bold shrink-0">
        {label}
      </span>
      <span className="font-mono text-sm text-white text-right break-all">
        {value || "Unknown"}
      </span>
    </div>
  );
}

export function SiteDiscoveryCard({ discovery }: Props) {
  const topAgents = discovery.userAgents.slice(0, 4).join(", ");
  const topSitemaps = discovery.sitemapUrls.slice(0, 4);
  const ruleCount = discovery.allowRules.length + discovery.disallowRules.length;

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex flex-col">
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
          <div>
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
    </div>
  );
}
