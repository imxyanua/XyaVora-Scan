import type { HttpOverviewResult } from "@/types";
import { DetailPanel } from "./DetailPanel";

type Props = {
  http: HttpOverviewResult;
};

export function RedirectsCard({ http }: Props) {
  const detailItems = http.redirectHops.map((hop, index) => ({
    label: `Hop ${index + 1}`,
    value: [
      `status: ${hop.statusCode}`,
      `from: ${hop.fromUrl}`,
      `to: ${hop.toUrl}`,
    ].join("\n"),
  }));

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Redirects
        </h3>
        <span className="font-mono text-[11px] text-white/70">
          [{http.redirectCount || 0} HOP{http.redirectCount === 1 ? "" : "S"}]
        </span>
      </div>

      {http.error ? (
        <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {http.error}</p>
      ) : http.redirectHops.length === 0 ? (
        <p className="font-mono text-sm text-[#d7e8ff]/65 px-4 py-4">No redirects detected.</p>
      ) : (
        <div className="flex-1">
          {http.redirectHops.slice(0, 3).map((hop, index) => (
            <div
              key={`${hop.fromUrl}-${hop.toUrl}-${index}`}
              className="px-5 py-3 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors"
            >
              <div className="flex justify-between gap-3 mb-1">
                <span className="font-mono text-sm text-white font-bold">
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
          {http.redirectHops.length > 3 && (
            <p className="px-5 py-2 font-mono text-[10px] text-[#d7e8ff]/55">
              + {http.redirectHops.length - 3} more redirect hops
            </p>
          )}
        </div>
      )}
      {!http.error && http.redirectHops.length > 0 && <DetailPanel items={detailItems} />}
    </div>
  );
}
