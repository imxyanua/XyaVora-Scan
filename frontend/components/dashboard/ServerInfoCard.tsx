import type { HttpOverviewResult } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

type Props = {
  http: HttpOverviewResult;
};

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

const CONFIDENCE_STYLE: Record<"high" | "medium" | "low", string> = {
  high: "border-primary-fixed/45 text-primary-fixed bg-primary-fixed/10",
  medium: "border-status-warn/50 text-status-warn bg-status-warn/10",
  low: "border-white/20 text-white/50 bg-white/[0.03]",
};

export function ServerInfoCard({ http }: Props) {
  const detailItems = [
    { label: "Status Code", value: http.statusCode },
    { label: "Final URL", value: http.finalUrl },
    { label: "Initial Host", value: http.initialHost },
    { label: "Final Host", value: http.finalHost },
    { label: "Final Protocol", value: http.finalProtocol },
    { label: "Host Changed", value: http.hostChanged },
    { label: "Redirect Count", value: http.redirectCount },
    { label: "Redirect Chain", value: http.redirectChain?.join("\n") },
    { label: "Server", value: http.server },
    { label: "Powered By", value: http.poweredBy },
    { label: "Via", value: http.via },
    { label: "CDN Provider", value: http.cdnProvider },
    { label: "CDN Confidence", value: http.cdnConfidence },
    { label: "CDN Evidence", value: http.cdnEvidence?.join("\n") },
    { label: "Alt-Svc", value: http.altSvc },
    { label: "Content Type", value: http.contentType },
    { label: "Content Length", value: http.contentLength },
    { label: "Response Bytes", value: http.responseBytes },
    { label: "Response Time", value: http.responseTimeMs ? `${http.responseTimeMs}ms` : undefined },
    { label: "Compression", value: http.compression },
    { label: "Cache Control", value: http.cacheControl },
    { label: "Expires", value: http.expires },
    { label: "ETag", value: http.etag },
    { label: "Last Modified", value: http.lastModified },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Server Info
        </h3>
        <span className="font-mono text-[11px] text-white/70">
          {http.cdnProvider ? "[CDN]" : "[HTTP]"}
        </span>
      </div>

      {http.error ? (
        <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {http.error}</p>
      ) : (
        <div>
          <Row label="Server" value={http.server} />
          <Row label="Powered By" value={http.poweredBy} />
          <Row label="CDN" value={http.cdnProvider} />
          {http.cdnProvider && (
            <div className="px-5 py-2 border-b border-primary-fixed/10 bg-[#151918]">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm text-white font-bold">CDN Source</span>
                <div className="flex items-center gap-2">
                  <SourceQualityBadge source="header" />
                  {http.cdnConfidence ? (
                    <span className={`font-mono text-[10px] border px-2 py-0.5 ${CONFIDENCE_STYLE[http.cdnConfidence]}`}>
                      {http.cdnConfidence.toUpperCase()}
                    </span>
                  ) : (
                    <span className="font-mono text-sm text-white/50">Unknown</span>
                  )}
                </div>
              </div>
              {(http.cdnEvidence?.length ?? 0) > 0 && (
                <div className="mt-2 space-y-1">
                  {http.cdnEvidence?.slice(0, 3).map((item) => (
                    <p key={item} className="font-mono text-[10px] text-[#d7e8ff]/65 break-all">
                      &gt; {item}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          <Row label="Via" value={http.via} />
          <Row label="Alt-Svc" value={http.altSvc} />
          <Row label="Cache" value={http.cacheControl} />
        </div>
      )}
      {!http.error && <DetailPanel items={detailItems} />}
    </div>
  );
}
