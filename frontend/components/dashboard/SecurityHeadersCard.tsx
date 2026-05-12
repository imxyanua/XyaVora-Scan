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
    <div className="card-panel flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-primary-fixed/20 bg-[#070B0F] flex justify-between items-center shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase">
          SYS.HTTP_SEC_HEADERS
        </h3>
        <div className="flex items-center gap-3 font-mono text-[11px] text-primary-fixed/40">
          <span>STATUS: {headers.statusCode}</span>
          {headers.redirectDetected && <span>[REDIRECT]</span>}
        </div>
      </div>

      {/* Headers table */}
      <div className="font-mono text-sm w-full">
        {headers.securityHeaders.map((h) => {
          const badge = STATUS_BADGE[h.status];
          return (
            <div
              key={h.header}
              className="data-grid-row flex justify-between items-start gap-3 px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <span className="text-primary-fixed">{h.header}</span>
                {h.value && (
                  <p className="text-primary-fixed/40 text-[10px] mt-0.5 truncate">
                    {h.value}
                  </p>
                )}
              </div>
              <span className={`status-badge ${badge.cls} text-[10px] shrink-0 mt-0.5`}>
                {badge.text}
              </span>
            </div>
          );
        })}

        {/* Server / X-Powered-By */}
        {headers.server && (
          <div className="data-grid-row flex justify-between items-start gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <span className="text-primary-fixed/70">Server</span>
              <p className="text-primary-fixed/40 text-[10px] mt-0.5 truncate">
                {headers.server}
              </p>
            </div>
            <span className="status-badge status-warn text-[10px] shrink-0 mt-0.5">[!!]</span>
          </div>
        )}
        {headers.xPoweredBy && (
          <div className="data-grid-row flex justify-between items-start gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <span className="text-primary-fixed/70">X-Powered-By</span>
              <p className="text-primary-fixed/40 text-[10px] mt-0.5 truncate">
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
