import type { HeadersResult, HeaderStatus } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

interface Props {
  headers: HeadersResult;
}

const STATUS_BADGE: Record<HeaderStatus, { cls: string; text: string }> = {
  present: { cls: "status-pass",    text: "[OK]"   },
  missing: { cls: "status-missing", text: "[-] NULL"},
  warning: { cls: "status-warn",    text: "[!!]"   },
};

export function SecurityHeadersCard({ headers }: Props) {
  const detailItems = [
    { label: "Status Code", value: headers.statusCode },
    { label: "Final URL", value: headers.finalUrl },
    { label: "Redirect Detected", value: headers.redirectDetected },
    { label: "Server", value: headers.server },
    { label: "X-Powered-By", value: headers.xPoweredBy },
    ...headers.securityHeaders.map((header) => ({
      label: header.header,
      value: [
        `status: ${header.status}`,
        header.confidence ? `confidence: ${header.confidence}` : null,
        header.value ? `value: ${header.value}` : null,
        header.evidence?.length ? `evidence: ${header.evidence.join(" | ")}` : null,
      ].filter(Boolean).join("\n"),
    })),
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Security Headers
        </h3>
        <div className="flex items-center gap-3 font-mono text-[11px] text-white/70">
          {headers.error
            ? <span className="text-error/70">[ERR]</span>
            : <>
                <span>STATUS: {headers.statusCode}</span>
                {headers.redirectDetected && <span>[REDIRECT]</span>}
              </>
          }
        </div>
      </div>

      {/* Headers table */}
      <div className="font-mono text-sm w-full">
        {headers.error && (
          <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {headers.error}</p>
        )}
        {!headers.error && headers.securityHeaders.map((h) => {
          const badge = STATUS_BADGE[h.status];
          return (
            <div
              key={h.header}
              className="px-5 py-3 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <span className="min-w-0 break-words text-white font-bold leading-snug">
                  {h.header}
                </span>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  {h.confidence && (
                    <div className="flex items-center gap-1.5">
                      <SourceQualityBadge source={h.status === "missing" ? "missing" : "header"} />
                      <span className="font-mono text-[9px] text-white/45">
                        {h.confidence.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className={`status-badge ${badge.cls} text-[10px]`}>
                    {badge.text}
                  </span>
                </div>
              </div>

              {h.value && (
                <p className="mt-2 border border-primary-fixed/10 bg-[#070B0F] px-2 py-1.5 text-[#d7e8ff]/75 text-[11px] leading-relaxed break-words">
                  {h.value}
                </p>
              )}
              {h.evidence && h.evidence.length > 0 && (
                <p className="text-[#d7e8ff]/45 text-[10px] mt-1.5 break-words" title={h.evidence.join("\n")}>
                  &gt; {h.evidence[0]}
                </p>
              )}
            </div>
          );
        })}

        {/* Server / X-Powered-By */}
        {headers.server && (
          <div className="flex justify-between items-start gap-4 px-5 py-2 border-b border-primary-fixed/10 hover:bg-primary-fixed/[0.04] transition-colors">
            <div className="min-w-0 flex-1">
              <span className="text-white font-bold">Server</span>
              <p className="text-[#d7e8ff]/70 text-[11px] mt-0.5 truncate">
                {headers.server}
              </p>
            </div>
            <span className="status-badge status-warn text-[10px] shrink-0 mt-0.5">[!!]</span>
          </div>
        )}
        {headers.xPoweredBy && (
          <div className="flex justify-between items-start gap-4 px-5 py-2 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
            <div className="min-w-0 flex-1">
              <span className="text-white font-bold">X-Powered-By</span>
              <p className="text-[#d7e8ff]/70 text-[11px] mt-0.5 truncate">
                {headers.xPoweredBy}
              </p>
            </div>
            <span className="status-badge status-warn text-[10px] shrink-0 mt-0.5">[!!]</span>
          </div>
        )}
      </div>
      {!headers.error && <DetailPanel items={detailItems} />}
    </div>
  );
}
