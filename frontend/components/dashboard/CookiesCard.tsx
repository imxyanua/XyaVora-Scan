import type { CookieResult } from "@/types";

interface Props {
  cookies: CookieResult[];
}

function FlagBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`font-mono text-[10px] border px-1.5 py-0.5 ${
        ok
          ? "border-primary-fixed/40 text-primary-fixed/70"
          : "border-error/60 text-error/80"
      }`}
    >
      {ok ? label : `!${label}`}
    </span>
  );
}

export function CookiesCard({ cookies }: Props) {
  return (
    <div className="bg-[#0D0F10] border border-primary-fixed/15 shadow-[3px_3px_0_#050505] p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-primary-fixed/20 pb-2 mb-3 shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-white uppercase">
          Cookies
        </h3>
        <span className="font-mono text-[11px] text-primary-fixed">
          [{cookies.length} COOKIE{cookies.length !== 1 ? "S" : ""}]
        </span>
      </div>

      {cookies.length === 0 ? (
        <p className="font-mono text-sm text-primary-fixed/60">[-] No cookies set</p>
      ) : (
        <div className="space-y-3">
          {cookies.map((c, i) => (
            <div
              key={`${c.name}-${i}`}
              className="border border-primary-fixed/15 bg-[#151918] p-2 hover:border-primary-fixed/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-sm text-white truncate max-w-[55%]">
                  {c.name}
                </span>
                <div className="flex gap-1 flex-wrap justify-end">
                  <FlagBadge ok={c.secure}   label="SEC" />
                  <FlagBadge ok={c.httpOnly} label="HTTP" />
                  <FlagBadge ok={!!c.sameSite} label="SS" />
                </div>
              </div>
              {c.sameSite && (
                <div className="font-mono text-[10px] text-[#d7e8ff]/55">
                  SameSite={c.sameSite}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
