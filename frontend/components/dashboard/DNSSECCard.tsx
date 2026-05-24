import type { DnsResult, WhoisResult } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

interface Props {
  dns: DnsResult;
  whois?: WhoisResult;
}

type DnssecStatus = "verified" | "reported" | "not-observed" | "error";

function registryReportsSigned(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return !["unsigned", "no", "false", "inactive", "not signed"].includes(normalized);
}

function statusFor(dns: DnsResult, whois?: WhoisResult): DnssecStatus {
  if (dns.error) return "error";
  if (dns.dnssecSigned) return "verified";
  if (registryReportsSigned(whois?.dnssec)) return "reported";
  return "not-observed";
}

const STATUS_STYLE: Record<DnssecStatus, { label: string; badge: string; source: "dns" | "whois" | "missing" }> = {
  verified: { label: "Verified", badge: "status-pass", source: "dns" },
  reported: { label: "Reported", badge: "status-warn", source: "whois" },
  "not-observed": { label: "Not Observed", badge: "status-warn", source: "missing" },
  error: { label: "Unavailable", badge: "status-missing", source: "missing" },
};

export function DNSSECCard({ dns, whois }: Props) {
  const status = statusFor(dns, whois);
  const style = STATUS_STYLE[status];
  const detailItems = [
    { label: "Status", value: status },
    { label: "Checked Host", value: dns.dnssecCheckedHost },
    { label: "Signed By DNS", value: dns.dnssecSigned },
    { label: "DNSSEC Confidence", value: dns.dnssecConfidence },
    { label: "WHOIS DNSSEC", value: whois?.dnssec },
    { label: "DS Records", value: dns.dnssecDsRecords?.join("\n") },
    { label: "DNSKEY Records", value: dns.dnssecDnskeyRecords?.join("\n") },
    { label: "DNSSEC Evidence", value: dns.dnssecEvidence?.join("\n") },
    { label: "WHOIS Evidence", value: whois?.whoisEvidence?.join("\n") },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0">
        <div>
          <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
            DNSSEC
          </h3>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#d7e8ff]/60">
            Delegation signing evidence from DS/DNSKEY records and registry data.
          </p>
        </div>
        <span className={`status-badge ${style.badge} text-[10px] shrink-0`}>
          {style.label}
        </span>
      </div>

      {dns.error ? (
        <p className="px-5 py-4 font-mono text-sm text-error/70">[-] {dns.error}</p>
      ) : (
        <div className="font-mono text-sm flex-1">
          <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 px-5 py-2 border-y border-primary-fixed/10 bg-[#151918]">
            <span className="font-bold text-white">Checked Host</span>
            <span className="min-w-0 break-words text-right text-white">
              {dns.dnssecCheckedHost ?? "Unknown"}
            </span>
          </div>
          <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 px-5 py-2 border-b border-primary-fixed/10">
            <span className="font-bold text-white">DS Records</span>
            <span className={dns.dnssecDsRecords?.length ? "text-right text-primary-fixed" : "text-right text-status-warn"}>
              {dns.dnssecDsRecords?.length ?? 0}
            </span>
          </div>
          <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 px-5 py-2 border-b border-primary-fixed/10">
            <span className="font-bold text-white">DNSKEY</span>
            <span className={dns.dnssecDnskeyRecords?.length ? "text-right text-primary-fixed" : "text-right text-[#d7e8ff]/70"}>
              {dns.dnssecDnskeyRecords?.length ?? 0}
            </span>
          </div>
          <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-4 px-5 py-2 border-b border-primary-fixed/10">
            <span className="font-bold text-white">WHOIS/RDAP</span>
            <span className="min-w-0 break-words text-right text-white">
              {whois?.dnssec ?? "Unknown"}
            </span>
          </div>
          <div className="px-5 py-3 flex flex-wrap items-center gap-2">
            <SourceQualityBadge source={style.source} />
            {status === "reported" && (
              <span className="font-mono text-[10px] text-status-warn">
                DNS records were not directly observed in this scan.
              </span>
            )}
          </div>
        </div>
      )}

      {!dns.error && <DetailPanel items={detailItems} label="DNSSEC Details" />}
    </div>
  );
}
