import type { WhoisResult } from "@/types";

interface Props {
  whois: WhoisResult;
}

function fmt(iso?: string): string {
  if (!iso) return "—";
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
    { key: "REGISTRAR",   val: whois.registrar  ?? "—" },
    { key: "CREATED",     val: fmt(whois.createdDate)  },
    { key: "UPDATED",     val: fmt(whois.updatedDate)  },
    { key: "EXPIRES",     val: fmt(whois.expiryDate)   },
    { key: "DNSSEC",      val: whois.dnssec     ?? "—" },
  ];

  return (
    <div className="bg-[#0D0F10] border border-primary-fixed/15 shadow-[3px_3px_0_#050505] p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-primary-fixed/20 pb-2 mb-3 shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-white uppercase">
          WHOIS
        </h3>
        <span className="font-mono text-[11px] text-primary-fixed">[REGISTRAR]</span>
      </div>

      {whois.error ? (
        <p className="font-mono text-sm text-primary-fixed/60">[-] {whois.error}</p>
      ) : (
        <div className="space-y-2 font-mono text-sm flex-1">
          {rows.map((row) => (
            <div key={row.key} className="flex justify-between gap-2">
              <span className="text-primary-fixed/65 shrink-0">{row.key}:</span>
              <span className="text-[#d7e8ff] text-right truncate">{row.val}</span>
            </div>
          ))}

          {whois.nameServers.length > 0 && (
            <div className="pt-2 border-t border-primary-fixed/15 border-dashed">
              <span className="text-primary-fixed/65 block mb-1">NS:</span>
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
    </div>
  );
}
