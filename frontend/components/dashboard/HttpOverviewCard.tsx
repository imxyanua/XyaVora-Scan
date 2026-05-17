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
    <div className="data-grid-row flex justify-between gap-4 px-4 py-2.5">
      <span className="font-mono text-[10px] text-primary-fixed/40 uppercase tracking-widest shrink-0">
        {label}
      </span>
      <span className="font-mono text-[11px] text-primary-fixed/70 text-right break-all">
        {value || "-"}
      </span>
    </div>
  );
}

export function HttpOverviewCard({ http }: Props) {
  return (
    <div className="card-panel flex flex-col">
      <div className="p-3 border-b border-primary-fixed/20 bg-[#070B0F] flex justify-between items-center shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase">
          SYS.HTTP_OVERVIEW
        </h3>
        <span className="font-mono text-[11px] text-primary-fixed/40">
          {http.error ? "[ERR]" : `[${http.responseTimeMs || 0}MS]`}
        </span>
      </div>

      {http.error ? (
        <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {http.error}</p>
      ) : (
        <div>
          <Row label="Status" value={http.statusCode} />
          <Row label="Final URL" value={http.finalUrl} />
          <Row label="Redirects" value={http.redirectCount} />
          <Row label="Content Type" value={http.contentType} />
          <Row label="Content Length" value={formatBytes(http.contentLength)} />
          <Row label="Bytes Read" value={formatBytes(http.responseBytes)} />
          <Row label="Compression" value={http.compression} />
          <Row label="Cache" value={http.cacheControl} />
          <Row label="ETag" value={http.etag} />
        </div>
      )}
    </div>
  );
}
