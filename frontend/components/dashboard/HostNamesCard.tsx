import type { HttpOverviewResult, PageMetadataResult } from "@/types";

type Props = {
  http: HttpOverviewResult;
  metadata: PageMetadataResult;
  hostname: string;
};

function Row({ label, value, tone = "normal" }: { label: string; value?: string | boolean | null; tone?: "normal" | "good" | "warn" }) {
  const valueClass = tone === "good"
    ? "text-primary-fixed"
    : tone === "warn"
    ? "text-status-warn"
    : "text-white";

  return (
    <div className="flex justify-between gap-4 px-5 py-1.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="font-mono text-sm text-white font-bold shrink-0">
        {label}
      </span>
      <span className={`font-mono text-sm ${valueClass} text-right break-all`}>
        {typeof value === "boolean" ? (value ? "YES" : "NO") : value || "Unknown"}
      </span>
    </div>
  );
}

function hostFromUrl(url?: string | null) {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

export function HostNamesCard({ http, metadata, hostname }: Props) {
  const canonicalHost = hostFromUrl(metadata.canonicalUrl);

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Host Names
        </h3>
        <span className="font-mono text-[11px] text-white/70">
          {http.hostChanged ? "[CHANGED]" : "[STABLE]"}
        </span>
      </div>

      {http.error ? (
        <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {http.error}</p>
      ) : (
        <div>
          <Row label="Input Host" value={hostname} />
          <Row label="Initial Host" value={http.initialHost} />
          <Row label="Final Host" value={http.finalHost} tone={http.hostChanged ? "warn" : "good"} />
          <Row label="Final Protocol" value={http.finalProtocol?.toUpperCase()} tone={http.finalProtocol === "https" ? "good" : "warn"} />
          <Row label="Host Changed" value={http.hostChanged} tone={http.hostChanged ? "warn" : "good"} />
          <Row label="Canonical Host" value={canonicalHost} />
        </div>
      )}
    </div>
  );
}
