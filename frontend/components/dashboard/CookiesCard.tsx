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
    <div className="card-panel p-4 flex flex-col glow-hover transition-all">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-primary-fixed/20 pb-2 mb-3 shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase">
          SYS.COOKIES_AUDIT
        </h3>
        <span className="font-mono text-[11px] text-primary-fixed/40">
          [{cookies.length} COOKIE{cookies.length !== 1 ? "S" : ""}]
        </span>
      </div>

      {cookies.length === 0 ? (
        <p className="font-mono text-sm text-primary-fixed/40">[-] No cookies set</p>
      ) : (
        <div className="space-y-3">
          {cookies.map((c, i) => (
            <div
              key={`${c.name}-${i}`}
              className="border border-primary-fixed/15 bg-primary-fixed/[0.03] p-2"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-sm text-primary-fixed truncate max-w-[55%]">
                  {c.name}
                </span>
                <div className="flex gap-1 flex-wrap justify-end">
                  <FlagBadge ok={c.secure}   label="SEC" />
                  <FlagBadge ok={c.httpOnly} label="HTTP" />
                  <FlagBadge ok={!!c.sameSite} label="SS" />
                </div>
              </div>
              {c.sameSite && (
                <div className="font-mono text-[10px] text-primary-fixed/40">
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
