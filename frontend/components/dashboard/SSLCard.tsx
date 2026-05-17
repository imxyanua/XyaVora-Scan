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
  const ttlDays     = Math.max(ssl.daysRemaining ?? 0, 0);
  const fillRatio   = Math.min(ttlDays / maxDays, 1);
  const filledSegs  = ttlDays > 0 ? Math.max(1, Math.ceil(fillRatio * CERT_SEGMENTS)) : 0;
  const ttlTone     = ttlDays <= 14 ? "bg-error" : isExpiring ? "bg-status-warn" : "bg-primary-fixed";
  const ttlText     = ttlDays <= 14 ? "text-error" : isExpiring ? "text-status-warn" : "text-secondary-fixed";

  const rows = [
    { key: "ISSUER",   val: ssl.issuer              },
    { key: "SUBJECT",  val: ssl.subject             },
    { key: "PROTOCOL", val: ssl.protocol ?? "TLS"   },
    { key: "TRUSTED",  val: ssl.trusted ? "YES" : "NO" },
  ];

  return (
    <div className="bg-[#0D0F10] border border-primary-fixed/15 shadow-[3px_3px_0_#050505] p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-primary-fixed/20 pb-2 mb-3 shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-white uppercase">
          SSL Certificate
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
              <span className="text-primary-fixed/65 shrink-0">{row.key}:</span>
              <span className="text-[#d7e8ff] text-right truncate">{row.val}</span>
            </div>
          ))}

          {/* Expiry + progress */}
          <div className="pt-3 border-t border-primary-fixed/15 border-dashed space-y-2.5">
            <div className="flex justify-between gap-2">
              <span className="text-primary-fixed/65 shrink-0">EXPIRY:</span>
              <span className="text-white">{validUntil}</span>
            </div>
            <div className="border border-primary-fixed/20 bg-[#070B0F] p-1">
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: CERT_SEGMENTS }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 border border-white/5 transition-colors ${
                      i < filledSegs ? ttlTone : "bg-[#151918]"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[9px] text-primary-fixed/50">
                <span>0D</span>
                <span>365D</span>
              </div>
            </div>
            <div className={`flex justify-between items-center text-[11px] ${ttlText}`}>
              <span className="text-primary-fixed/55">CERTIFICATE TTL</span>
              <span>{ttlDays}_DAYS REMAINING</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
