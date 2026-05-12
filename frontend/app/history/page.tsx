import Link from "next/link";
import { AppShell }      from "@/components/layout/AppShell";
import { mockHistory }   from "@/mock/historyData";
import type { HistoryEntry } from "@/mock/historyData";

const GRADE_CLASS: Record<HistoryEntry["grade"], string> = {
  A: "text-status-pass",
  B: "text-primary-fixed",
  C: "text-status-warn",
  D: "text-orange-400",
  F: "text-error",
};

const STATUS_CLASS: Record<HistoryEntry["status"], string> = {
  "Low Risk":    "status-badge status-pass",
  "Medium Risk": "status-badge status-warn",
  "High Risk":   "status-badge status-fail",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function HistoryPage() {
  return (
    <AppShell>
      <div className="p-4 md:p-8 w-full max-w-[1440px] mx-auto">

        {/* Page header */}
        <div className="mb-8 pb-4 border-b border-primary-fixed/15 flex items-end justify-between">
          <div>
            <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest block mb-1">
              &gt; SCAN_HISTORY
            </span>
            <h1 className="font-mono text-xl font-bold text-primary-fixed">HISTORY</h1>
            <p className="font-mono text-[11px] text-primary-fixed/40 mt-1">
              {mockHistory.length} scans on record
            </p>
          </div>
          <Link
            href="/scan"
            className="btn-primary px-5 py-2 text-xs flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            NEW SCAN
          </Link>
        </div>

        {/* Table */}
        <div className="card-panel overflow-x-auto">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_160px_64px_40px_120px_60px_100px] gap-x-4 px-4 py-2 border-b border-primary-fixed/20 bg-[#070B0F]">
            {["DOMAIN", "SCANNED_AT", "SCORE", "GRD", "STATUS", "ISSUES", ""].map((h) => (
              <span key={h} className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {mockHistory.map((entry, i) => (
            <div
              key={entry.id}
              className={`grid grid-cols-[1fr_160px_64px_40px_120px_60px_100px] gap-x-4 px-4 py-3 items-center glow-hover transition-colors ${
                i > 0 ? "border-t border-primary-fixed/10" : ""
              }`}
            >
              {/* Domain */}
              <span className="font-mono text-sm text-primary-fixed truncate">
                {entry.domain}
              </span>

              {/* Scanned at */}
              <span className="font-mono text-[11px] text-primary-fixed/50">
                {formatDate(entry.scanTime)}
              </span>

              {/* Score */}
              <span className="font-mono text-sm text-secondary-fixed font-bold">
                {entry.score}
                <span className="text-primary-fixed/30 text-[10px]">/100</span>
              </span>

              {/* Grade */}
              <span className={`font-mono text-sm font-bold ${GRADE_CLASS[entry.grade]}`}>
                [{entry.grade}]
              </span>

              {/* Status */}
              <span className={STATUS_CLASS[entry.status]}>
                {entry.status.toUpperCase().replace(" ", "_")}
              </span>

              {/* Issues */}
              <span className="font-mono text-[11px] text-primary-fixed/50">
                {entry.issues > 0 ? (
                  <span className="text-status-warn">[{entry.issues}]</span>
                ) : (
                  <span className="text-status-pass">[0]</span>
                )}
              </span>

              {/* Action */}
              <Link
                href={`/report/${entry.domain}`}
                className="btn-ghost px-2 py-1 text-[10px] text-center whitespace-nowrap"
              >
                VIEW &gt;
              </Link>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}
