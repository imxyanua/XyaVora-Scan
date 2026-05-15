import Link from "next/link";
import { AppShell }   from "@/components/layout/AppShell";
import { ScanLink }   from "@/components/scan/ScanLink";
import { getHistory } from "@/lib/api";
import type { RiskGrade, RiskStatus } from "@/types";

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

export default async function DomainsPage() {
  const res  = await getHistory();
  const rows = res.success ? res.data : [];

  // Aggregate by domain — keep only the latest entry per domain
  const domainMap = new Map<string, typeof rows[0] & { scanCount: number }>();
  for (const row of rows) {
    const existing = domainMap.get(row.domain);
    if (!existing) {
      domainMap.set(row.domain, { ...row, scanCount: 1 });
    } else {
      existing.scanCount++;
      // rows are newest-first, so first occurrence = latest scan — no update needed
    }
  }
  const domains = Array.from(domainMap.values());

  return (
    <AppShell>
      <div className="p-4 md:p-8 w-full max-w-[1440px] mx-auto space-y-6">

        {/* Header */}
        <div className="pb-4 border-b border-primary-fixed/15 flex items-end justify-between">
          <div>
            <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest block mb-1">
              &gt; SYS.DOMAIN_REGISTRY
            </span>
            <h1 className="font-mono text-xl font-bold text-primary-fixed">DOMAINS</h1>
            <p className="font-mono text-[11px] text-primary-fixed/40 mt-1">
              {domains.length} unique domain{domains.length !== 1 ? "s" : ""} scanned
            </p>
          </div>
          <Link href="/scan" className="btn-primary px-5 py-2 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">add</span>
            NEW SCAN
          </Link>
        </div>

        {domains.length === 0 ? (
          <div className="card-panel p-12 flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary-fixed/20">dns</span>
            <p className="font-mono text-[11px] text-primary-fixed/30">[-] NO_DOMAINS_YET</p>
            <Link href="/scan" className="btn-ghost px-4 py-2 text-xs mt-2">&gt; RUN_FIRST_SCAN</Link>
          </div>
        ) : (
          <div className="card-panel">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-[1fr_80px_40px_120px_60px_80px_100px] gap-x-4 px-4 py-2 border-b border-primary-fixed/20 bg-[#070B0F]">
              {["DOMAIN", "SCANS", "GRD", "STATUS", "ISSUES", "LAST_SCAN", ""].map((h) => (
                <span key={h} className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest">
                  {h}
                </span>
              ))}
            </div>

            {/* Domain rows */}
            {domains.map((d, i) => (
              <div
                key={d.domain}
                className={`grid grid-cols-1 sm:grid-cols-[1fr_80px_40px_120px_60px_80px_100px] gap-x-4 gap-y-2 px-4 py-3 items-center glow-hover transition-colors ${
                  i > 0 ? "border-t border-primary-fixed/10" : ""
                }`}
              >
                {/* Mobile: domain + grade */}
                <div className="flex items-center justify-between sm:contents">
                  <span className="font-mono text-sm text-primary-fixed font-bold truncate">{d.domain}</span>
                  <span className={`font-mono text-lg font-bold sm:hidden ${GRADE_CLASS[d.grade]}`}>[{d.grade}]</span>
                </div>

                <span className="font-mono text-[11px] text-primary-fixed/50 hidden sm:block">
                  [{d.scanCount}]
                </span>
                <span className={`font-mono text-sm font-bold hidden sm:block ${GRADE_CLASS[d.grade]}`}>
                  [{d.grade}]
                </span>
                <span className={`${STATUS_CLASS[d.status]} text-[10px] hidden sm:inline-flex`}>
                  {d.status.toUpperCase().replace(" ", "_")}
                </span>
                <span className="font-mono text-[11px] hidden sm:block">
                  {d.issues > 0
                    ? <span className="text-status-warn">[{d.issues}]</span>
                    : <span className="text-status-pass">[0]</span>}
                </span>
                <span className="font-mono text-[10px] text-primary-fixed/40 hidden sm:block truncate">
                  {formatDate(d.scanTime)}
                </span>

                {/* Actions */}
                <div className="flex gap-2 items-center sm:justify-end">
                  <Link
                    href={`/report/${d.domain}?id=${d.id}`}
                    className="btn-ghost px-2 py-1 text-[10px] whitespace-nowrap"
                  >
                    VIEW &gt;
                  </Link>
                  <ScanLink
                    target={d.domain}
                    className="font-mono text-[10px] text-primary-fixed/40 hover:text-primary-fixed transition-colors whitespace-nowrap"
                  >
                    RESCAN
                  </ScanLink>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
