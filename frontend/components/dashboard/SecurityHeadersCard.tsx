import type { HeadersResult, HeaderStatus } from "@/types";

interface Props {
  headers: HeadersResult;
}

const STATUS_BADGE: Record<HeaderStatus, { cls: string; text: string }> = {
  present: { cls: "status-pass",    text: "[OK]"   },
  missing: { cls: "status-missing", text: "[-] NULL"},
  warning: { cls: "status-warn",    text: "[!!]"   },
};

export function SecurityHeadersCard({ headers }: Props) {
  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex flex-col">
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
              className="flex justify-between items-start gap-4 px-5 py-2 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <span className="text-white font-bold">{h.header}</span>
                {h.value && (
                  <p className="text-[#d7e8ff]/70 text-[11px] mt-0.5 truncate">
                    {h.value}
                  </p>
                )}
                {h.evidence && h.evidence.length > 0 && (
                  <p className="text-[#d7e8ff]/45 text-[10px] mt-0.5 truncate" title={h.evidence.join("\n")}>
                    &gt; {h.evidence[0]}
                  </p>
                )}
              </div>
              {h.confidence && (
                <span className="font-mono text-[9px] text-white/45 shrink-0 mt-1">
                  {h.confidence.toUpperCase()}
                </span>
              )}
              <span className={`status-badge ${badge.cls} text-[10px] shrink-0 mt-0.5`}>
                {badge.text}
              </span>
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
    </div>
  );
}
