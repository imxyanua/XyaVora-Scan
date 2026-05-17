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
    { key: "CONTACT",    val: securityTxt.contact    ?? "—" },
    { key: "POLICY",     val: securityTxt.policy     ?? "—" },
    { key: "ENCRYPTION", val: securityTxt.encryption ?? "—" },
    { key: "EXPIRES",    val: securityTxt.expires    ?? "—" },
  ];

  return (
    <div className="bg-[#0D0F10] border border-primary-fixed/15 shadow-[3px_3px_0_#050505] p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-primary-fixed/20 pb-2 mb-3 shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-white uppercase">
          Security.txt
        </h3>
        <span className={`${statusCls} text-[10px]`}>{statusLabel}</span>
      </div>

      {securityTxt.error ? (
        <p className="font-mono text-sm text-error/70">[-] {securityTxt.error}</p>
      ) : !securityTxt.present ? (
        <div className="space-y-2">
          <p className="font-mono text-sm text-[#d7e8ff]/65">
            No security.txt found at well-known or root path.
          </p>
          <p className="font-mono text-[10px] text-primary-fixed/50">
            &gt; RFC 9116 recommends publishing a security.txt
          </p>
        </div>
      ) : (
        <div className="space-y-2 font-mono text-sm">
          {securityTxt.location && (
            <div className="text-[10px] text-primary-fixed/60 mb-2 truncate">
              &gt; {securityTxt.location}
            </div>
          )}
          {rows.map((row) => (
            <div key={row.key} className="flex justify-between gap-2">
              <span className="text-primary-fixed/65 shrink-0">{row.key}:</span>
              <span className="text-[#d7e8ff] text-right truncate max-w-[65%]">
                {row.val}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
