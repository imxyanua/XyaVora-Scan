import type { HttpOverviewResult } from "@/types";

type Props = {
  http: HttpOverviewResult;
};

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="font-mono text-[10px] text-primary-fixed/65 uppercase tracking-widest shrink-0">
        {label}
      </span>
      <span className="font-mono text-[11px] text-[#d7e8ff] text-right break-all">
        {value || "-"}
      </span>
    </div>
  );
}

export function ServerInfoCard({ http }: Props) {
  return (
    <div className="bg-[#0D0F10] border border-primary-fixed/15 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="p-3 border-b border-primary-fixed/20 bg-[#151918] flex justify-between items-center shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-white uppercase">
          Server Info
        </h3>
        <span className="font-mono text-[11px] text-primary-fixed">
          {http.cdnProvider ? "[CDN]" : "[HTTP]"}
        </span>
      </div>

      {http.error ? (
        <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {http.error}</p>
      ) : (
        <div>
          <Row label="Server" value={http.server} />
          <Row label="Powered By" value={http.poweredBy} />
          <Row label="CDN" value={http.cdnProvider} />
          <Row label="Via" value={http.via} />
          <Row label="Alt-Svc" value={http.altSvc} />
          <Row label="Cache" value={http.cacheControl} />
        </div>
      )}
    </div>
  );
}
