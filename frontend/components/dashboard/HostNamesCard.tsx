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
    : "text-[#d7e8ff]";

  return (
    <div className="flex justify-between gap-4 px-4 py-2.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="font-mono text-[10px] text-primary-fixed/65 uppercase tracking-widest shrink-0">
        {label}
      </span>
      <span className={`font-mono text-[11px] ${valueClass} text-right break-all`}>
        {typeof value === "boolean" ? (value ? "YES" : "NO") : value || "-"}
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
    <div className="bg-[#0D0F10] border border-primary-fixed/15 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="p-3 border-b border-primary-fixed/20 bg-[#151918] flex justify-between items-center shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-white uppercase">
          Host Names
        </h3>
        <span className="font-mono text-[11px] text-primary-fixed">
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
