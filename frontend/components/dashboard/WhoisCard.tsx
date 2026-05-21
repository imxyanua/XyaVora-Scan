import type { WhoisResult } from "@/types";
import { DetailPanel } from "./DetailPanel";

interface Props {
  whois: WhoisResult;
}

function fmt(iso?: string): string {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      year: "numeric", month: "short", day: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function WhoisCard({ whois }: Props) {
  const rows = [
    { key: "REGISTRAR",   val: whois.registrar  ?? "Unknown" },
    { key: "CREATED",     val: fmt(whois.createdDate)  },
    { key: "UPDATED",     val: fmt(whois.updatedDate)  },
    { key: "EXPIRES",     val: fmt(whois.expiryDate)   },
    { key: "DAYS LEFT",   val: whois.expiryDaysRemaining ?? "Unknown" },
    { key: "DNSSEC",      val: whois.dnssec     ?? "Unknown" },
  ];
  const detailItems = [
    { label: "Registrar", value: whois.registrar },
    { label: "Created", value: whois.createdDate },
    { label: "Updated", value: whois.updatedDate },
    { label: "Expires", value: whois.expiryDate },
    { label: "Days Remaining", value: whois.expiryDaysRemaining },
    { label: "DNSSEC", value: whois.dnssec },
    { label: "Name Servers", value: whois.nameServers?.join("\n") },
    { label: "WHOIS Evidence", value: whois.whoisEvidence?.join("\n") },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          WHOIS
        </h3>
        <span className="shrink-0 border border-primary-fixed/20 bg-[#070B0F] px-2 py-0.5 font-mono text-[10px] text-white/60">
          REGISTRY
        </span>
      </div>

      {whois.error ? (
        <p className="font-mono text-sm text-primary-fixed/60 px-5 py-4">[-] {whois.error}</p>
      ) : (
        <div className="font-mono text-sm flex-1">
          {rows.map((row) => (
            <div key={row.key} className="flex justify-between gap-4 px-5 py-1.5 border-b border-primary-fixed/10 hover:bg-primary-fixed/[0.04] transition-colors">
              <span className="text-white font-bold shrink-0">{row.key}</span>
              <span className="min-w-0 break-words text-right text-white">{row.val}</span>
            </div>
          ))}

          {whois.nameServers.length > 0 && (
            <div className="px-5 py-3 border-t border-primary-fixed/10 bg-[#151918]">
              <span className="text-white font-bold block mb-1">NS</span>
              <div className="space-y-1">
                {whois.nameServers.slice(0, 4).map((ns) => (
                  <div key={ns} className="text-[#d7e8ff]/75 text-xs truncate pl-2">
                    &gt; {ns}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {!whois.error && <DetailPanel items={detailItems} />}
    </div>
  );
}
