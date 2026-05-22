import type { ScoreBreakdownItem, ScoreGroupBreakdown } from "@/types";

type Props = {
  breakdown?: ScoreBreakdownItem[];
  groups?: ScoreGroupBreakdown[];
};

function groupLabel(group: string) {
  return group
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ScoreBreakdownCard({ breakdown = [], groups = [] }: Props) {
  const totalApplied = groups.reduce((sum, group) => sum + group.appliedDeduction, 0);
  const topItems = breakdown.filter((item) => item.appliedDeduction > 0).slice(0, 5);

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] p-5">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
            Score Breakdown
          </h3>
          <p className="mt-2 max-w-3xl font-mono text-[13px] leading-relaxed text-[#d7e8ff]/70">
            Deductions are weighted by finding confidence and capped by group, so best-practice observations do not dominate the final grade.
          </p>
        </div>
        <span className="shrink-0 border border-status-warn/45 bg-status-warn/10 px-2 py-1 font-mono text-[11px] leading-none text-status-warn">
          -{totalApplied} APPLIED
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="border border-primary-fixed/15 bg-[#151918] p-3 font-mono text-sm text-[#d7e8ff]/70">
          No scoring deductions were applied.
        </p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="space-y-2">
            {groups.map((group) => {
              const pct = Math.min(100, Math.round((group.appliedDeduction / group.cap) * 100));
              return (
                <div key={group.group} className="border border-primary-fixed/15 bg-[#151918] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3 font-mono text-xs">
                    <span className="font-bold text-white">{groupLabel(group.group)}</span>
                    <span className="text-[#d7e8ff]/65">
                      -{group.appliedDeduction} / cap {group.cap}
                    </span>
                  </div>
                  <div className="h-2 border border-primary-fixed/20 bg-[#070B0F]">
                    <div className="h-full bg-primary-fixed" style={{ width: `${pct}%` }} />
                  </div>
                  {group.rawDeduction > group.appliedDeduction && (
                    <p className="mt-2 font-mono text-[11px] text-status-warn/75">
                      Raw -{group.rawDeduction}, capped to -{group.appliedDeduction}.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            {topItems.map((item) => (
              <div key={`${item.findingId}-${item.group}`} className="border border-primary-fixed/15 bg-[#151918] p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-mono text-sm font-bold leading-snug text-white">
                    {item.title}
                  </p>
                  <span className="shrink-0 border border-primary-fixed/35 px-2 py-0.5 font-mono text-[10px] text-primary-fixed">
                    -{item.appliedDeduction}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#d7e8ff]/60">
                  {item.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
