import type { HttpOverviewResult } from "@/types";
import { DetailPanel } from "./DetailPanel";

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
  const displayValue = value === undefined || value === null || value === "" ? "Unknown" : String(value);

  return (
    <div className="grid grid-cols-[128px_minmax(0,1fr)] gap-4 px-5 py-1.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="font-mono text-sm text-white font-bold shrink-0">
        {label}
      </span>
      <span className="min-w-0 break-words text-right font-mono text-sm text-white" title={displayValue}>
        {displayValue}
      </span>
    </div>
  );
}

export function HttpOverviewCard({ http }: Props) {
  const detailItems = [
    { label: "Status", value: http.statusCode },
    { label: "Final URL", value: http.finalUrl },
    { label: "Content Type", value: http.contentType },
    { label: "Content Family", value: http.contentFamily },
    { label: "Content Length", value: http.contentLength },
    { label: "Bytes Read", value: http.responseBytes },
    { label: "Response Truncated", value: http.responseTruncated },
    { label: "Response Time", value: http.responseTimeMs ? `${http.responseTimeMs}ms` : undefined },
    { label: "Compression", value: http.compression },
    { label: "Cache Policy", value: http.cachePolicy },
    { label: "ETag", value: http.etag },
    { label: "Last Modified", value: http.lastModified },
    { label: "Cache Control", value: http.cacheControl },
    { label: "Expires", value: http.expires },
    { label: "Response Evidence", value: http.responseEvidence?.join("\n") },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          HTTP Overview
        </h3>
        <span className="font-mono text-[11px] text-white/70">
          {http.error ? "[ERR]" : `[${http.responseTimeMs || 0}MS]`}
        </span>
      </div>

      {http.error ? (
        <div className="mx-5 mb-5 border border-error/25 bg-error/[0.04] p-3">
          <p className="font-mono text-sm text-error/80">[-] {http.error}</p>
          <p className="mt-1 font-mono text-[11px] text-[#d7e8ff]/55">
            The scanner could not complete the HTTP overview request for this URL.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <Row label="Status" value={http.statusCode} />
          <Row label="Final URL" value={http.finalUrl} />
          <Row label="Content Type" value={http.contentType} />
          <Row label="Family" value={http.contentFamily} />
          <Row label="Content Length" value={formatBytes(http.contentLength)} />
          <Row label="Bytes Read" value={`${formatBytes(http.responseBytes)}${http.responseTruncated ? " (truncated)" : ""}`} />
          <Row label="Compression" value={http.compression} />
          <Row label="Cache Policy" value={http.cachePolicy} />
          <Row label="ETag" value={http.etag} />
          <Row label="Last Modified" value={http.lastModified} />
        </div>
      )}
      {!http.error && <DetailPanel items={detailItems} />}
    </div>
  );
}
