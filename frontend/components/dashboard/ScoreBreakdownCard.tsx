import type {
  FindingClassification,
  FindingConfidence,
  ScoreBreakdownItem,
  ScoreGroupBreakdown,
} from "@/types";

type Props = {
  breakdown?: ScoreBreakdownItem[];
  groups?: ScoreGroupBreakdown[];
};

const GROUP_DETAIL: Record<string, string> = {
  transport: "TLS availability, certificate validity, protocol and cipher posture.",
  headers: "Browser-side HTTP security controls such as HSTS, CSP, and framing policy.",
  dns: "DNS and email authentication posture, including SPF and DMARC.",
  cookies: "Cookie transport and browser access controls.",
  domain: "WHOIS, domain expiry, and DNSSEC registration signals.",
  disclosure: "security.txt disclosure workflow quality.",
  general: "HTTP behavior, metadata, discovery, and miscellaneous scanner observations.",
};

const CLASSIFICATION_LABEL: Record<FindingClassification, string> = {
  "verified-issue": "Verified issue",
  "observed-risk": "Observed risk",
  "hardening-recommendation": "Hardening",
  "investigation-lead": "Investigate",
  informational: "Info",
};

const CLASSIFICATION_CLASS: Record<FindingClassification, string> = {
  "verified-issue": "border-error/70 text-error bg-error/5",
  "observed-risk": "border-status-warn/70 text-status-warn bg-status-warn/5",
  "hardening-recommendation": "border-primary-fixed/40 text-primary-fixed bg-primary-fixed/[0.04]",
  "investigation-lead": "border-secondary-fixed/60 text-secondary-fixed bg-secondary-fixed/[0.04]",
  informational: "border-primary-fixed/25 text-primary-fixed/60 bg-primary-fixed/[0.03]",
};

const CONFIDENCE_LABEL: Record<FindingConfidence, string> = {
  verified: "Verified",
  observed: "Observed",
  inferred: "Inferred",
  "best-practice": "Best practice",
};

function groupLabel(group: string) {
  return group
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function barClass(pct: number) {
  if (pct >= 75) return "bg-error";
  if (pct >= 45) return "bg-status-warn";
  return "bg-primary-fixed";
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function formatWeight(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function ScoreBreakdownCard({ breakdown = [], groups = [] }: Props) {
  const totalApplied = groups.reduce((sum, group) => sum + group.appliedDeduction, 0);
  const totalRaw = groups.reduce((sum, group) => sum + group.rawDeduction, 0);
  const cappedAmount = Math.max(totalRaw - totalApplied, 0);
  const cappedGroups = groups.filter((group) => group.rawDeduction > group.appliedDeduction);
  const topItems = breakdown
    .filter((item) => item.appliedDeduction > 0)
    .sort((a, b) => b.appliedDeduction - a.appliedDeduction || b.weightedDeduction - a.weightedDeduction)
    .slice(0, 8);

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
        <div className="flex flex-wrap gap-2 md:justify-end">
          <span className="shrink-0 border border-status-warn/45 bg-status-warn/10 px-2 py-1 font-mono text-[11px] leading-none text-status-warn">
            -{totalApplied} APPLIED
          </span>
          <span className="shrink-0 border border-primary-fixed/25 bg-primary-fixed/[0.04] px-2 py-1 font-mono text-[11px] leading-none text-primary-fixed/75">
            -{totalRaw} RAW
          </span>
          {cappedAmount > 0 && (
            <span className="shrink-0 border border-secondary-fixed/45 bg-secondary-fixed/[0.04] px-2 py-1 font-mono text-[11px] leading-none text-secondary-fixed">
              {cappedAmount} CAPPED
            </span>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="border border-primary-fixed/15 bg-[#151918] p-3 font-mono text-sm text-[#d7e8ff]/70">
          No scoring deductions were applied.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border border-primary-fixed/15 bg-[#151918] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary-fixed/55">
                Raw Deduction
              </p>
              <p className="mt-2 font-mono text-2xl font-bold text-white">-{totalRaw}</p>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-[#d7e8ff]/55">
                Sum after confidence weighting, before group caps.
              </p>
            </div>
            <div className="border border-status-warn/25 bg-[#151918] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-status-warn/75">
                Applied To Score
              </p>
              <p className="mt-2 font-mono text-2xl font-bold text-status-warn">-{totalApplied}</p>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-[#d7e8ff]/55">
                Final deduction used to calculate the report score.
              </p>
            </div>
            <div className="border border-primary-fixed/15 bg-[#151918] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary-fixed/55">
                Group Caps
              </p>
              <p className="mt-2 font-mono text-2xl font-bold text-primary-fixed">
                {cappedGroups.length}
              </p>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-[#d7e8ff]/55">
                {cappedGroups.length > 0
                  ? `${cappedGroups.map((group) => groupLabel(group.group)).join(", ")} capped.`
                  : "No group cap changed the score."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-2">
              {groups.map((group) => {
                const pct = clampPercent((group.appliedDeduction / group.cap) * 100);
                return (
                  <div key={group.group} className="border border-primary-fixed/15 bg-[#151918] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 font-mono text-xs">
                      <span className="font-bold text-white">{groupLabel(group.group)}</span>
                      <span className="text-[#d7e8ff]/65">
                        -{group.appliedDeduction} / cap {group.cap}
                      </span>
                    </div>
                    <div className="h-2 border border-primary-fixed/20 bg-[#070B0F]">
                      <div className={`h-full ${barClass(pct)}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#d7e8ff]/55">
                      {GROUP_DETAIL[group.group] ?? "Score group for related scanner findings."}
                    </p>
                    {group.rawDeduction > group.appliedDeduction && (
                      <p className="mt-2 font-mono text-[11px] text-status-warn/75">
                        Raw -{group.rawDeduction}, capped to -{group.appliedDeduction}.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border border-primary-fixed/15 bg-[#151918]">
              <div className="flex items-center justify-between gap-3 border-b border-primary-fixed/10 px-3 py-2">
                <p className="font-mono text-sm font-bold text-white">Top Score Drivers</p>
                <span className="font-mono text-[10px] text-primary-fixed/55">
                  {topItems.length} ITEMS
                </span>
              </div>
              <div className="divide-y divide-primary-fixed/10">
                {topItems.map((item) => (
                  <div key={`${item.findingId}-${item.group}`} className="p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 font-mono text-sm font-bold leading-snug text-white">
                        {item.title}
                      </p>
                      <span className="shrink-0 border border-status-warn/45 bg-status-warn/10 px-2 py-0.5 font-mono text-[10px] text-status-warn">
                        -{item.appliedDeduction}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.classification && (
                        <span className={`font-mono text-[10px] border px-2 py-0.5 ${CLASSIFICATION_CLASS[item.classification]}`}>
                          {CLASSIFICATION_LABEL[item.classification]}
                        </span>
                      )}
                      <span className="font-mono text-[10px] border border-primary-fixed/20 px-2 py-0.5 text-primary-fixed/65">
                        {groupLabel(item.group)}
                      </span>
                      <span className="font-mono text-[10px] border border-primary-fixed/20 px-2 py-0.5 text-[#d7e8ff]/55">
                        {CONFIDENCE_LABEL[item.confidence]} x {formatWeight(item.confidenceWeight)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="border border-primary-fixed/10 bg-[#0d1214] px-2 py-1.5">
                        <p className="font-mono text-[10px] text-primary-fixed/50">Base</p>
                        <p className="font-mono text-sm text-white">-{item.baseDeduction}</p>
                      </div>
                      <div className="border border-primary-fixed/10 bg-[#0d1214] px-2 py-1.5">
                        <p className="font-mono text-[10px] text-primary-fixed/50">Weighted</p>
                        <p className="font-mono text-sm text-white">-{item.weightedDeduction}</p>
                      </div>
                      <div className="border border-primary-fixed/10 bg-[#0d1214] px-2 py-1.5">
                        <p className="font-mono text-[10px] text-primary-fixed/50">Applied</p>
                        <p className="font-mono text-sm text-status-warn">-{item.appliedDeduction}</p>
                      </div>
                    </div>
                    <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#d7e8ff]/60">
                      {item.reason}
                    </p>
                  </div>
                ))}
                {topItems.length === 0 && (
                  <p className="p-3 font-mono text-sm text-[#d7e8ff]/70">
                    No individual finding changed the score.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border border-primary-fixed/15 bg-[#101415] p-3">
            <p className="font-mono text-[11px] uppercase tracking-widest text-primary-fixed/65">
              Scoring Model
            </p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <p className="font-mono text-xs leading-relaxed text-[#d7e8ff]/65">
                Base deductions come from the finding type and status.
              </p>
              <p className="font-mono text-xs leading-relaxed text-[#d7e8ff]/65">
                Confidence weighting lowers best-practice and inferred observations.
              </p>
              <p className="font-mono text-xs leading-relaxed text-[#d7e8ff]/65">
                Group caps prevent one noisy category from dominating the final score.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
