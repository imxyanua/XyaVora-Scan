import type { DnsResult } from "@/types";
import { DetailPanel } from "./DetailPanel";

interface Props {
  dns: DnsResult;
}

const TYPE_COLOR: Record<string, string> = {
  A: "text-secondary-fixed",
  AAAA: "text-secondary-fixed",
  MX: "text-secondary-container",
  NS: "text-primary-fixed/75",
  TXT: "text-secondary-container",
  CNAME: "text-primary-fixed/75",
  SOA: "text-primary-fixed/75",
};

export function DNSRecordsCard({ dns }: Props) {
  const detailItems = dns.records.map((record, index) => ({
    label: `${record.type} #${index + 1}`,
    value: [
      `host: ${record.host}`,
      `value: ${record.value}`,
      `ttl: ${record.ttl ?? "Unknown"}`,
    ].join("\n"),
  }));

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] overflow-hidden flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          DNS Records
        </h3>
        <div className="flex items-center gap-3 font-mono text-[11px] text-white/70">
          {dns.spfDetected && <span className="status-badge status-pass text-[10px]">[SPF]</span>}
          {dns.dmarcDetected && <span className="status-badge status-warn text-[10px]">[DMARC]</span>}
          <span>[RESOLVED]</span>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        {dns.error ? (
          <p className="font-mono text-sm text-error/70 px-5 py-6">[-] {dns.error}</p>
        ) : (
          <>
            <table className="w-full text-left font-mono text-sm border-collapse">
              <thead className="text-white border-b border-primary-fixed/15 bg-[#151918]">
                <tr>
                  {["TYPE", "HOST", "VALUE", "TTL"].map((col) => (
                    <th key={col} className="px-5 py-2 font-bold text-xs">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dns.records.map((record, i) => {
                  const typeColor = TYPE_COLOR[record.type] ?? "text-primary-fixed/75";
                  return (
                    <tr
                      key={i}
                      className="border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors"
                    >
                      <td className={`px-5 py-2 ${typeColor} font-semibold`}>
                        [{record.type}]
                      </td>
                      <td className="px-5 py-2 text-white max-w-[120px] truncate">
                        {record.host}
                      </td>
                      <td className="px-5 py-2 text-white max-w-[200px] truncate">
                        {record.value}
                      </td>
                      <td className="px-5 py-2 text-white">
                        {record.ttl ?? "Unknown"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {dns.records.length === 0 && (
              <p className="font-mono text-sm text-on-surface-variant/50 px-5 py-6">
                [-] No DNS records found
              </p>
            )}
          </>
        )}
      </div>
      {!dns.error && <DetailPanel items={detailItems} label="All DNS Records" />}
    </div>
  );
}
