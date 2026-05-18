import type { SslResult } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

interface Props {
  ssl: SslResult;
}

const CERT_SEGMENTS = 10;
const CONFIDENCE_STYLE: Record<"high" | "medium" | "low", string> = {
  high: "border-primary-fixed/45 text-primary-fixed bg-primary-fixed/10",
  medium: "border-status-warn/50 text-status-warn bg-status-warn/10",
  low: "border-white/20 text-white/50 bg-white/[0.03]",
};

export function SSLCard({ ssl }: Props) {
  const isExpiring  = ssl.daysRemaining < 30;
  const overallStatus = ssl.error
    ? { cls: "status-fail",    label: "[ERR]"          }
    : !ssl.httpsAvailable
    ? { cls: "status-fail",    label: "[FAIL] NO HTTPS" }
    : isExpiring
    ? { cls: "status-warn",    label: "[!!] EXPIRING"   }
    : { cls: "status-pass",    label: "[OK] VALID"       };

  const validUntil  = ssl.validTo ? new Date(ssl.validTo).toLocaleDateString("en-GB") : "Unknown";
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
    { key: "CIPHER",   val: ssl.cipherName          },
    { key: "CIPHER BITS", val: ssl.cipherBits        },
    { key: "TRUSTED",  val: ssl.trusted ? "YES" : "NO" },
  ];

  const detailItems = [
    { label: "Issuer", value: ssl.issuer },
    { label: "Subject", value: ssl.subject },
    { label: "Valid From", value: ssl.validFrom },
    { label: "Valid To", value: ssl.validTo },
    { label: "Days Remaining", value: ssl.daysRemaining },
    { label: "Trusted", value: ssl.trusted },
    { label: "Protocol", value: ssl.protocol },
    { label: "Cipher", value: ssl.cipherName },
    { label: "Cipher Bits", value: ssl.cipherBits },
    { label: "SAN Domains", value: ssl.sanDomains?.join("\n") },
    { label: "Evidence", value: ssl.certificateEvidence?.join("\n") },
    { label: "Warning", value: ssl.warning },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          SSL Certificate
        </h3>
        <span className={`status-badge ${overallStatus.cls} text-[10px]`}>
          {overallStatus.label}
        </span>
      </div>

      {ssl.error ? (
        <p className="font-mono text-sm text-error/70 px-5 py-4">[-] {ssl.error}</p>
      ) : (
        <div className="font-mono text-sm flex-1">
          {rows.map((row) => (
            <div key={row.key} className="flex justify-between gap-4 px-5 py-1.5 border-b border-primary-fixed/10 hover:bg-primary-fixed/[0.04] transition-colors">
              <span className="text-white font-bold shrink-0">{row.key}</span>
              <span className="text-white text-right truncate">{row.val || "Unknown"}</span>
            </div>
          ))}

          {ssl.tlsConfidence && (
            <div className="flex justify-between gap-4 px-5 py-1.5 border-b border-primary-fixed/10 bg-[#151918]">
              <span className="text-white font-bold shrink-0">SOURCE</span>
              <div className="flex items-center gap-2">
                <SourceQualityBadge source="tls" />
                <span className={`font-mono text-[10px] border px-2 py-0.5 ${CONFIDENCE_STYLE[ssl.tlsConfidence]}`}>
                  {ssl.tlsConfidence.toUpperCase()}
                </span>
              </div>
            </div>
          )}

          <div className="px-5 pt-3 pb-4 space-y-2.5">
            <div className="flex justify-between gap-2">
              <span className="text-white font-bold shrink-0">EXPIRY</span>
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
            {(ssl.certificateEvidence?.length ?? 0) > 0 && (
              <div className="border-t border-primary-fixed/10 pt-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white font-bold text-xs">EVIDENCE</p>
                  <SourceQualityBadge source="tls" />
                </div>
                {ssl.certificateEvidence?.slice(0, 5).map((item) => (
                  <p key={item} className="font-mono text-[10px] text-[#d7e8ff]/65 break-all">
                    &gt; {item}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {!ssl.error && <DetailPanel items={detailItems} />}
    </div>
  );
}
