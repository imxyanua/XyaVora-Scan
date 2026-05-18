import type { SecurityTxtResult } from "@/types";

interface Props {
  securityTxt: SecurityTxtResult;
}

export function SecurityTxtCard({ securityTxt }: Props) {
  const statusCls = securityTxt.present
    ? "status-badge status-pass"
    : "status-badge status-warn";
  const statusLabel = securityTxt.present ? "[PRESENT]" : "[MISSING]";

  const rows = [
    { key: "CONTACT", val: securityTxt.contact ?? "Unknown" },
    { key: "POLICY", val: securityTxt.policy ?? "Unknown" },
    { key: "ENCRYPTION", val: securityTxt.encryption ?? "Unknown" },
    { key: "EXPIRES", val: securityTxt.expires ?? "Unknown" },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Security.txt
        </h3>
        <span className={`${statusCls} text-[10px]`}>{statusLabel}</span>
      </div>

      {securityTxt.error ? (
        <p className="font-mono text-sm text-error/70 px-5 pb-5">[-] {securityTxt.error}</p>
      ) : !securityTxt.present ? (
        <div className="px-5 pb-5 space-y-2">
          <p className="font-mono text-sm text-[#d7e8ff]/65">
            No security.txt found at well-known or root path.
          </p>
          <p className="font-mono text-[11px] text-primary-fixed/60">
            &gt; RFC 9116 recommends publishing a security.txt
          </p>
        </div>
      ) : (
        <div className="font-mono text-sm flex-1">
          {securityTxt.location && (
            <div className="px-5 py-2 text-[11px] text-[#d7e8ff]/70 border-y border-primary-fixed/10 bg-[#151918] truncate">
              &gt; {securityTxt.location}
            </div>
          )}
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex justify-between gap-4 px-5 py-1.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors"
            >
              <span className="text-white font-bold shrink-0">{row.key}</span>
              <span className="text-white text-right truncate max-w-[65%]">
                {row.val}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
