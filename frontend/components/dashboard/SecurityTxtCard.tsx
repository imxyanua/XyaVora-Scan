import type { SecurityTxtResult } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

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
  const checkedPreview = securityTxt.checkedLocations?.slice(0, 2) ?? [];
  const detailItems = [
    { label: "Location", value: securityTxt.location },
    { label: "Contact", value: securityTxt.contact },
    { label: "Policy", value: securityTxt.policy },
    { label: "Encryption", value: securityTxt.encryption },
    { label: "Expires", value: securityTxt.expires },
    { label: "Expired", value: securityTxt.expired },
    { label: "Checked Locations", value: securityTxt.checkedLocations?.join("\n") },
    { label: "Evidence", value: securityTxt.securityTxtEvidence?.join("\n") },
    { label: "Raw", value: securityTxt.raw },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Security.txt
        </h3>
        <div className="flex items-center gap-2">
          <SourceQualityBadge source={securityTxt.present ? "page" : "missing"} />
          <span className={`${statusCls} text-[10px]`}>{statusLabel}</span>
        </div>
      </div>

      {securityTxt.error ? (
        <div className="mx-5 mb-5 border border-error/25 bg-error/[0.04] p-3">
          <p className="font-mono text-sm text-error/80">[-] {securityTxt.error}</p>
          <p className="mt-1 font-mono text-[11px] text-[#d7e8ff]/55">
            security.txt could not be checked for this target.
          </p>
        </div>
      ) : !securityTxt.present ? (
        <div className="px-5 pb-5 space-y-2">
          <p className="font-mono text-sm text-[#d7e8ff]/75">
            No usable security.txt was observed at the standard locations.
          </p>
          <p className="font-mono text-[11px] text-primary-fixed/65 leading-relaxed">
            This is a responsible-disclosure hardening recommendation, not a runtime vulnerability.
          </p>
          {checkedPreview.length > 0 && (
            <div className="border border-primary-fixed/10 bg-[#151918] p-2 space-y-1">
              {checkedPreview.map((item) => (
                <p key={item} className="font-mono text-[10px] text-[#d7e8ff]/55 break-all">
                  &gt; checked: {item}
                </p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="font-mono text-sm flex-1">
          {securityTxt.location && (
            <div className="px-5 py-2 text-[11px] text-[#d7e8ff]/70 border-y border-primary-fixed/10 bg-[#151918] break-all">
              &gt; {securityTxt.location}
            </div>
          )}
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 px-5 py-1.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors"
            >
              <span className="text-white font-bold shrink-0">{row.key}</span>
              <span className="min-w-0 text-white text-right break-words">
                {row.val}
              </span>
            </div>
          ))}
        </div>
      )}
      {!securityTxt.error && <DetailPanel items={detailItems} />}
    </div>
  );
}
