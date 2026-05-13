import Link from "next/link";
import { AppShell }   from "@/components/layout/AppShell";
import { getHistory } from "@/lib/api";
import type { HistoryEntry, RiskGrade, RiskStatus } from "@/types";

const GRADE_CLASS: Record<RiskGrade, string> = {
  A: "text-status-pass",
  B: "text-primary-fixed",
  C: "text-status-warn",
  D: "text-orange-400",
  F: "text-error",
};

const STATUS_CLASS: Record<RiskStatus, string> = {
  "Low Risk":    "status-badge status-pass",
  "Medium Risk": "status-badge status-warn",
  "High Risk":   "status-badge status-fail",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export default async function DashboardPage() {
  const res  = await getHistory();
  const rows: HistoryEntry[] = res.success ? res.data : [];

  const totalScans = rows.length;
  const avgScore   = totalScans
    ? Math.round(rows.reduce((s, r) => s + r.score, 0) / totalScans)
    : 0;
  const critCount  = rows.reduce((n, r) => n + (r.status === "High Risk" ? 1 : 0), 0);
  const recent     = rows.slice(0, 5);

  const gradeCounts = rows.reduce<Record<string, number>>(
    (acc, r) => { acc[r.grade] = (acc[r.grade] ?? 0) + 1; return acc; },
    {},
  );

  return (
    <AppShell>
      <div className="p-4 md:p-8 w-full max-w-[1440px] mx-auto space-y-6">

        {/* Page header */}
        <div className="pb-4 border-b border-primary-fixed/15 flex items-end justify-between">
          <div>
            <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest block mb-1">
              &gt; SYS.DASHBOARD
            </span>
            <h1 className="font-mono text-xl font-bold text-primary-fixed">OVERVIEW</h1>
          </div>
          <Link href="/scan" className="btn-primary px-5 py-2 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">radar</span>
            NEW SCAN
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "TOTAL_SCANS",   value: totalScans, sub: "all time",          cls: "text-primary-fixed"   },
            { label: "AVG_SCORE",     value: avgScore,   sub: "across all scans",  cls: "text-secondary-fixed" },
            { label: "HIGH_RISK",     value: critCount,  sub: "scans flagged",      cls: critCount > 0 ? "text-error" : "text-status-pass" },
            { label: "CLEAN_SCANS",   value: totalScans - critCount, sub: "low or medium risk", cls: "text-status-pass" },
          ].map((stat) => (
            <div key={stat.label} className="card-panel p-4 flex flex-col gap-2">
              <span className="font-mono text-[10px] text-primary-fixed/40 uppercase tracking-widest">{stat.label}</span>
              <span className={`font-mono text-3xl font-bold ${stat.cls}`}>{stat.value}</span>
              <span className="font-mono text-[10px] text-primary-fixed/30">{stat.sub}</span>
            </div>
          ))}
        </div>

        {/* Grade distribution + Recent scans */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Grade breakdown */}
          <div className="card-panel p-4 flex flex-col">
            <h2 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase border-b border-primary-fixed/20 pb-2 mb-4">
              SYS.GRADE_DIST
            </h2>
            {totalScans === 0 ? (
              <p className="font-mono text-[11px] text-primary-fixed/30">[-] NO_DATA</p>
            ) : (
              <div className="space-y-3">
                {(["A","B","C","D","F"] as RiskGrade[]).map((g) => {
                  const count = gradeCounts[g] ?? 0;
                  const pct   = totalScans ? Math.round((count / totalScans) * 100) : 0;
                  return (
                    <div key={g} className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className={`font-bold ${GRADE_CLASS[g]}`}>[{g}]</span>
                        <span className="text-primary-fixed/40">{count} scan{count !== 1 ? "s" : ""} · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-primary-fixed/10 w-full">
                        <div
                          className="h-full bg-primary-fixed/60 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent scans */}
          <div className="lg:col-span-2 card-panel flex flex-col">
            <div className="flex justify-between items-center border-b border-primary-fixed/20 px-4 py-3 bg-[#070B0F]">
              <h2 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase">
                SYS.RECENT_SCANS
              </h2>
              <Link href="/history" className="font-mono text-[10px] text-primary-fixed/40 hover:text-primary-fixed transition-colors">
                VIEW_ALL &gt;
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                <span className="material-symbols-outlined text-3xl text-primary-fixed/20">radar</span>
                <p className="font-mono text-[11px] text-primary-fixed/30">[-] NO_SCANS_YET</p>
                <Link href="/scan" className="btn-ghost px-4 py-2 text-xs">&gt; RUN_FIRST_SCAN</Link>
              </div>
            ) : (
              <div className="flex-1">
                {recent.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-4 px-4 py-3 glow-hover transition-colors ${
                      i > 0 ? "border-t border-primary-fixed/10" : ""
                    }`}
                  >
                    <span className={`font-mono text-lg font-bold shrink-0 ${GRADE_CLASS[entry.grade]}`}>
                      [{entry.grade}]
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-primary-fixed truncate">{entry.domain}</p>
                      <p className="font-mono text-[10px] text-primary-fixed/40 mt-0.5">{formatDate(entry.scanTime)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm text-secondary-fixed font-bold hidden sm:block">
                        {entry.score}<span className="text-primary-fixed/30 text-[10px]">/100</span>
                      </span>
                      <span className={`${STATUS_CLASS[entry.status]} text-[10px] hidden md:inline-flex`}>
                        {entry.status.toUpperCase().replace(" ", "_")}
                      </span>
                      <Link
                        href={`/report/${entry.domain}?id=${entry.id}`}
                        className="btn-ghost px-2 py-1 text-[10px] whitespace-nowrap"
                      >
                        VIEW &gt;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick scan shortcuts */}
        <div className="card-panel p-4">
          <h2 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase border-b border-primary-fixed/20 pb-2 mb-4">
            SYS.QUICK_SCAN
          </h2>
          <div className="flex flex-wrap gap-2">
            {["google.com", "github.com", "cloudflare.com", "mozilla.org", "fastapi.tiangolo.com"].map((d) => (
              <Link
                key={d}
                href={`/scanning?target=${encodeURIComponent(d)}`}
                className="btn-ghost px-3 py-1.5 text-[11px]"
              >
                {d}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
