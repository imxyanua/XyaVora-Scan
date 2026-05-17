import type { HttpOverviewResult } from "@/types";

type Props = {
  http: HttpOverviewResult;
};

export function RedirectsCard({ http }: Props) {
  return (
    <div className="bg-[#0D0F10] border border-primary-fixed/15 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="p-3 border-b border-primary-fixed/20 bg-[#151918] flex justify-between items-center shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-white uppercase">
          Redirects
        </h3>
        <span className="font-mono text-[11px] text-primary-fixed">
          [{http.redirectCount || 0} HOP{http.redirectCount === 1 ? "" : "S"}]
        </span>
      </div>

      {http.error ? (
        <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {http.error}</p>
      ) : http.redirectHops.length === 0 ? (
        <p className="font-mono text-sm text-[#d7e8ff]/65 px-4 py-4">No redirects detected.</p>
      ) : (
        <div>
          {http.redirectHops.map((hop, index) => (
            <div
              key={`${hop.fromUrl}-${hop.toUrl}-${index}`}
              className="px-4 py-3 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors"
            >
              <div className="flex justify-between gap-3 mb-1">
                <span className="font-mono text-[10px] text-primary-fixed/65 uppercase tracking-widest">
                  Hop {index + 1}
                </span>
                <span className="status-badge status-warn text-[10px]">
                  {hop.statusCode}
                </span>
              </div>
              <p className="font-mono text-[10px] text-[#d7e8ff]/60 truncate">
                {hop.fromUrl}
              </p>
              <p className="font-mono text-[10px] text-white truncate">
                {hop.toUrl}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
