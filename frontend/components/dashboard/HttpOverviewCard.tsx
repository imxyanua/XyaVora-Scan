import type { HttpOverviewResult } from "@/types";

interface Props {
  http: HttpOverviewResult;
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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

export function HttpOverviewCard({ http }: Props) {
  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          HTTP Overview
        </h3>
        <span className="font-mono text-[11px] text-white/70">
          {http.error ? "[ERR]" : `[${http.responseTimeMs || 0}MS]`}
        </span>
      </div>

      {http.error ? (
        <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {http.error}</p>
      ) : (
        <div>
          <Row label="Status" value={http.statusCode} />
          <Row label="Final URL" value={http.finalUrl} />
          <Row label="Content Type" value={http.contentType} />
          <Row label="Content Length" value={formatBytes(http.contentLength)} />
          <Row label="Bytes Read" value={formatBytes(http.responseBytes)} />
          <Row label="Compression" value={http.compression} />
          <Row label="ETag" value={http.etag} />
          <Row label="Last Modified" value={http.lastModified} />
        </div>
      )}
    </div>
  );
}
