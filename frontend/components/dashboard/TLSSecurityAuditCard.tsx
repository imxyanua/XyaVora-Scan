import type { SslResult } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

interface Props {
  ssl: SslResult;
}

type AuditStatus = "pass" | "warn" | "fail" | "missing";

type AuditItem = {
  label: string;
  status: AuditStatus;
  value: string;
  note: string;
};

const STATUS: Record<AuditStatus, { badge: string; text: string }> = {
  pass: { badge: "status-pass", text: "[OK]" },
  warn: { badge: "status-warn", text: "[REVIEW]" },
  fail: { badge: "status-fail", text: "[FAIL]" },
  missing: { badge: "status-missing", text: "[-]" },
};

function protocolStatus(protocol?: string): AuditStatus {
  if (!protocol) return "missing";
  if (["SSLv2", "SSLv3", "TLSv1", "TLSv1.1"].includes(protocol)) return "fail";
  if (protocol === "TLSv1.2" || protocol === "TLSv1.3") return "pass";
  return "warn";
}

function cipherStatus(bits?: number): AuditStatus {
  if (bits === undefined || bits === null) return "missing";
  if (bits < 128) return "fail";
  return "pass";
}

function expiryStatus(daysRemaining: number, validTo?: string): AuditStatus {
  if (validTo && Date.parse(validTo) <= Date.now()) return "fail";
  if (daysRemaining <= 0) return "warn";
  if (daysRemaining < 30) return "warn";
  return "pass";
}

function buildAuditItems(ssl: SslResult): AuditItem[] {
  if (ssl.error || !ssl.httpsAvailable) {
    return [
      {
        label: "HTTPS Reachability",
        status: "fail",
        value: ssl.httpsAvailable ? "Partial TLS response" : "No usable HTTPS",
        note: ssl.error ?? "TLS handshake did not complete.",
      },
    ];
  }

  return [
    {
      label: "Certificate Trust",
      status: ssl.trusted ? "pass" : "fail",
      value: ssl.trusted ? "Trusted by system CA store" : "Untrusted certificate",
      note: "Verified by the backend TLS handshake using the default trust store.",
    },
    {
      label: "Certificate Expiry",
      status: expiryStatus(ssl.daysRemaining, ssl.validTo),
      value: `${ssl.daysRemaining ?? 0} days remaining`,
      note: ssl.warning ?? "Certificate is within the observed validity window.",
    },
    {
      label: "Protocol",
      status: protocolStatus(ssl.protocol),
      value: ssl.protocol ?? "Unknown",
      note: ssl.protocol === "TLSv1.3"
        ? "Best current negotiated protocol."
        : ssl.protocol === "TLSv1.2"
        ? "Acceptable for compatibility; TLS 1.3 is preferred when available."
        : "Protocol is either unknown or needs review.",
    },
    {
      label: "Cipher Strength",
      status: cipherStatus(ssl.cipherBits),
      value: ssl.cipherName ? `${ssl.cipherName} (${ssl.cipherBits ?? "?"} bits)` : "Unknown",
      note: "Based on the cipher suite negotiated during this scan.",
    },
    {
      label: "SAN Coverage",
      status: ssl.sanDomains?.length ? "pass" : "warn",
      value: `${ssl.sanDomains?.length ?? 0} DNS names`,
      note: "Hostname verification passed if the certificate is trusted; SAN count is supporting evidence.",
    },
  ];
}

export function TLSSecurityAuditCard({ ssl }: Props) {
  const auditItems = buildAuditItems(ssl);
  const failed = auditItems.filter((item) => item.status === "fail").length;
  const warnings = auditItems.filter((item) => item.status === "warn" || item.status === "missing").length;
  const overall = failed > 0 ? "fail" : warnings > 0 ? "warn" : "pass";
  const overallLabel = failed > 0 ? "Issues" : warnings > 0 ? "Review" : "Clean";
  const detailItems = [
    { label: "HTTPS Available", value: ssl.httpsAvailable },
    { label: "Trusted", value: ssl.trusted },
    { label: "Protocol", value: ssl.protocol },
    { label: "Cipher", value: ssl.cipherName },
    { label: "Cipher Bits", value: ssl.cipherBits },
    { label: "Days Remaining", value: ssl.daysRemaining },
    { label: "SAN Domains", value: ssl.sanDomains?.join("\n") },
    { label: "TLS Confidence", value: ssl.tlsConfidence },
    { label: "Audit Summary", value: auditItems.map((item) => `${item.label}: ${item.status} - ${item.value}`).join("\n") },
    { label: "Evidence", value: ssl.certificateEvidence?.join("\n") },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0">
        <div>
          <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
            TLS Security Audit
          </h3>
          <p className="mt-2 max-w-xl font-mono text-[11px] leading-relaxed text-[#d7e8ff]/60">
            Direct handshake audit for the negotiated certificate, protocol, and cipher.
          </p>
        </div>
        <span className={`status-badge ${STATUS[overall].badge} text-[10px] shrink-0`}>
          {overallLabel}
        </span>
      </div>

      <div className="px-5 pb-3 flex flex-wrap items-center gap-2">
        <SourceQualityBadge source={ssl.httpsAvailable ? "tls" : "missing"} />
        <span className="font-mono text-[10px] text-[#d7e8ff]/55">
          Observed connection, not a full protocol matrix.
        </span>
      </div>

      <div className="font-mono text-sm flex-1">
        {auditItems.map((item) => {
          const status = STATUS[item.status];
          return (
            <div
              key={item.label}
              className="px-5 py-3 border-t border-primary-fixed/10 hover:bg-primary-fixed/[0.04] transition-colors"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-white">{item.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#d7e8ff]/60">
                    {item.note}
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <span className={`status-badge ${status.badge} text-[10px]`}>
                    {status.text}
                  </span>
                  <p className="mt-1 max-w-[16rem] break-words text-[11px] text-white">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <DetailPanel items={detailItems} label="TLS Audit Details" />
    </div>
  );
}
