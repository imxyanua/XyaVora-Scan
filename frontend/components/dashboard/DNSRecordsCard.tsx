import type { DnsResult } from "@/types";

interface Props {
  dns: DnsResult;
}

const TYPE_COLOR: Record<string, string> = {
  A:     "text-secondary-fixed",
  AAAA:  "text-secondary-fixed",
  MX:    "text-secondary-container",
  NS:    "text-primary-fixed/60",
  TXT:   "text-secondary-container",
  CNAME: "text-primary-fixed/60",
  SOA:   "text-primary-fixed/60",
};

export function DNSRecordsCard({ dns }: Props) {
  return (
    <div className="bg-[#0D0F10] border border-primary-fixed/15 shadow-[3px_3px_0_#050505] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-primary-fixed/20 bg-[#151918] flex justify-between items-center shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-white uppercase">
          DNS Records
        </h3>
        <div className="flex items-center gap-3 font-mono text-[11px] text-primary-fixed">
          {dns.spfDetected   && <span className="status-badge status-pass text-[10px]">[SPF]</span>}
          {dns.dmarcDetected && <span className="status-badge status-warn text-[10px]">[DMARC]</span>}
          <span>[RESOLVED]</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        {dns.error ? (
          <p className="font-mono text-sm text-error/70 px-4 py-6">[-] {dns.error}</p>
        ) : (
          <>
            <table className="w-full text-left font-mono text-sm border-collapse">
              <thead className="text-primary-fixed/65 border-b border-primary-fixed/15 bg-[#151918]">
                <tr>
                  {["TYPE", "HOST", "VALUE", "TTL"].map((col) => (
                    <th key={col} className="px-4 py-2 font-normal text-[11px] uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dns.records.map((record, i) => {
                  const typeColor = TYPE_COLOR[record.type] ?? "text-primary-fixed/60";
                  return (
                    <tr key={i} className="border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
                      <td className={`px-4 py-2 ${typeColor} font-semibold`}>
                        [{record.type}]
                      </td>
                      <td className="px-4 py-2 text-[#d7e8ff]/70 max-w-[120px] truncate">
                        {record.host}
                      </td>
                      <td className="px-4 py-2 text-white max-w-[200px] truncate">
                        {record.value}
                      </td>
                      <td className="px-4 py-2 text-primary-fixed/65">
                        {record.ttl ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {dns.records.length === 0 && (
              <p className="font-mono text-sm text-on-surface-variant/40 px-4 py-6">
                [-] No DNS records found
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
