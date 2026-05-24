import type { CookieResult } from "@/types";
import { DetailPanel } from "./DetailPanel";

interface Props {
  cookies: CookieResult[];
}

function FlagBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`font-mono text-[10px] border px-1.5 py-0.5 ${
        ok
          ? "border-primary-fixed/40 text-primary-fixed/70"
          : "border-status-warn/60 text-status-warn/85"
      }`}
    >
      {ok ? label : `!${label}`}
    </span>
  );
}

export function CookiesCard({ cookies }: Props) {
  const detailItems = cookies.flatMap((cookie, index) => [
    {
      label: `${cookie.name || `Cookie ${index + 1}`}`,
      value: [
        `secure: ${cookie.secure}`,
        `httponly: ${cookie.httpOnly}`,
        `samesite: ${cookie.sameSite ?? "missing"}`,
        cookie.expires ? `expires: ${cookie.expires}` : null,
        cookie.maxAge !== undefined ? `max_age: ${cookie.maxAge}` : null,
        cookie.warnings.length ? `warnings: ${cookie.warnings.join(" | ")}` : null,
        cookie.evidence?.length ? `evidence: ${cookie.evidence.join(" | ")}` : null,
      ].filter(Boolean).join("\n"),
    },
  ]);

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Cookies
        </h3>
        <span className="font-mono text-[11px] text-white/70">
          [{cookies.length} COOKIE{cookies.length !== 1 ? "S" : ""}]
        </span>
      </div>

      {cookies.length === 0 ? (
        <div className="px-5 pb-5">
          <div className="border border-primary-fixed/15 bg-[#151918] p-3">
            <p className="font-mono text-sm text-[#d7e8ff]/75">No cookies were set on the initial response.</p>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-primary-fixed/60">
              Later interactive app flows may still set cookies.
            </p>
          </div>
        </div>
      ) : (
        <div className="max-h-[320px] space-y-3 overflow-y-auto px-5 pb-5 pr-3">
          {cookies.map((c, i) => (
            <div
              key={`${c.name}-${i}`}
              className="border border-primary-fixed/15 bg-[#151918] p-3 hover:border-primary-fixed/40 transition-colors"
            >
              <div className="flex flex-col gap-2 mb-1.5 sm:flex-row sm:items-start sm:justify-between">
                <span className="min-w-0 break-words font-mono text-sm text-white font-bold">
                  {c.name}
                </span>
                <div className="flex shrink-0 gap-1 flex-wrap sm:justify-end">
                  <FlagBadge ok={c.secure}   label="SEC" />
                  <FlagBadge ok={c.httpOnly} label="HTTP" />
                  <FlagBadge ok={!!c.sameSite} label="SS" />
                </div>
              </div>
              {c.sameSite && (
                <div className="font-mono text-[11px] text-[#d7e8ff]/70">
                  SameSite={c.sameSite}
                </div>
              )}
              {c.warnings.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-primary-fixed/10 pt-2">
                  {c.warnings.slice(0, 2).map((warning) => (
                    <p key={warning} className="font-mono text-[10px] leading-relaxed text-status-warn/75">
                      &gt; {warning}
                    </p>
                  ))}
                </div>
              )}
              {c.evidence && c.evidence.length > 0 && (
                <p className="mt-1 truncate font-mono text-[10px] text-[#d7e8ff]/45" title={c.evidence.join("\n")}>
                  &gt; {c.evidence[0]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {cookies.length > 0 && <DetailPanel items={detailItems} />}
    </div>
  );
}
