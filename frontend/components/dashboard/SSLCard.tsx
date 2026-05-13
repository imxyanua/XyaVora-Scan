import type { SslResult } from "@/types";

interface Props {
  ssl: SslResult;
}

const CERT_SEGMENTS = 10;

export function SSLCard({ ssl }: Props) {
  const isExpiring  = ssl.daysRemaining < 30;
  const overallStatus = ssl.error
    ? { cls: "status-fail",    label: "[ERR]"          }
    : !ssl.httpsAvailable
    ? { cls: "status-fail",    label: "[FAIL] NO HTTPS" }
    : isExpiring
    ? { cls: "status-warn",    label: "[!!] EXPIRING"   }
    : { cls: "status-pass",    label: "[OK] VALID"       };

  const validUntil  = ssl.validTo ? new Date(ssl.validTo).toLocaleDateString("en-GB") : "—";
  const maxDays     = 365;
  const fillRatio   = Math.min((ssl.daysRemaining ?? 0) / maxDays, 1);
  const filledSegs  = Math.round(fillRatio * CERT_SEGMENTS);

  const rows = [
    { key: "ISSUER",   val: ssl.issuer              },
    { key: "SUBJECT",  val: ssl.subject             },
    { key: "PROTOCOL", val: ssl.protocol ?? "TLS"   },
    { key: "TRUSTED",  val: ssl.trusted ? "YES" : "NO" },
  ];

  return (
    <div className="card-panel p-4 glow-hover transition-all flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-primary-fixed/20 pb-2 mb-3 shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase">
          SYS.SSL_CERT_DATA
        </h3>
        <span className={`status-badge ${overallStatus.cls} text-[10px]`}>
          {overallStatus.label}
        </span>
      </div>

      {ssl.error ? (
        <p className="font-mono text-sm text-error/70">[-] {ssl.error}</p>
      ) : (
        /* Data rows */
        <div className="space-y-2 font-mono text-sm flex-1">
          {rows.map((row) => (
            <div key={row.key} className="flex justify-between gap-2">
              <span className="text-primary-fixed/50 shrink-0">{row.key}:</span>
              <span className="text-primary-fixed text-right truncate">{row.val}</span>
            </div>
          ))}

          {/* Expiry + progress */}
          <div className="pt-2 border-t border-primary-fixed/15 border-dashed space-y-2">
            <div className="flex justify-between gap-2">
              <span className="text-primary-fixed/50 shrink-0">EXPIRY:</span>
              <span className="text-primary-fixed">{validUntil}</span>
            </div>
            <div className="w-full h-2 bg-[#070B0F] border border-primary-fixed/20 flex overflow-hidden">
              {Array.from({ length: CERT_SEGMENTS }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r border-[#070B0F] last:border-r-0 ${
                    i < filledSegs ? "bg-primary-fixed" : "bg-transparent"
                  }`}
                />
              ))}
            </div>
            <div className="text-right text-[11px] text-secondary-fixed">
              &gt; TTL: {ssl.daysRemaining}_DAYS
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
