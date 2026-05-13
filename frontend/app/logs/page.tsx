"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import type { LogEntry, RiskGrade, RiskStatus } from "@/types";

const GRADE_CLASS: Record<RiskGrade, string> = {
  A: "text-status-pass", B: "text-primary-fixed",
  C: "text-status-warn", D: "text-orange-400", F: "text-error",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function formatMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export default function LogsPage() {
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [autoRefresh, setAuto]  = useState(false);

  const fetch_logs = useCallback(async () => {
    try {
      const res  = await fetch("/api/logs", { cache: "no-store" });
      const body = await res.json();
      if (body.success) {
        setLogs(body.data);
        setError(null);
      } else {
        setError(body.error ?? "Failed to load logs");
      }
    } catch {
      setError("Backend unreachable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_logs(); }, [fetch_logs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetch_logs, 3000);
    return () => clearInterval(id);
  }, [autoRefresh, fetch_logs]);

  return (
    <AppShell>
      <div className="p-4 md:p-8 w-full max-w-[1440px] mx-auto space-y-6">

        {/* Header */}
        <div className="pb-4 border-b border-primary-fixed/15 flex items-end justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest block mb-1">
              &gt; SYS.SCAN_LOG
            </span>
            <h1 className="font-mono text-xl font-bold text-primary-fixed">LOGS</h1>
            <p className="font-mono text-[11px] text-primary-fixed/40 mt-1">
              {logs.length} entr{logs.length !== 1 ? "ies" : "y"} · in-memory, resets on restart
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAuto((v) => !v)}
              className={`btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5 ${autoRefresh ? "border-primary-fixed text-primary-fixed" : ""}`}
            >
              <span className={`material-symbols-outlined text-[14px] ${autoRefresh ? "animate-spin" : ""}`}>sync</span>
              {autoRefresh ? "AUTO ON" : "AUTO OFF"}
            </button>
            <button
              type="button"
              onClick={fetch_logs}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              REFRESH
            </button>
          </div>
        </div>

        {loading && (
          <p className="font-mono text-[11px] text-primary-fixed/40 animate-pulse">
            &gt; LOADING_LOGS...
          </p>
        )}

        {error && (
          <p className="font-mono text-sm text-error">[-] {error}</p>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="card-panel p-12 flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary-fixed/20">terminal</span>
            <p className="font-mono text-[11px] text-primary-fixed/30">[-] NO_LOGS_YET — run a scan to see entries</p>
          </div>
        )}

        {logs.length > 0 && (
          <div className="card-panel overflow-x-auto">
            <div className="min-w-[680px]">
              {/* Table header */}
              <div className="grid grid-cols-[140px_1fr_80px_64px_40px_100px_80px] gap-x-4 px-4 py-2 border-b border-primary-fixed/20 bg-[#070B0F]">
                {["TIME", "DOMAIN", "DURATION", "SCORE", "GRD", "STATUS", ""].map((h) => (
                  <span key={h} className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest">
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[140px_1fr_80px_64px_40px_100px_80px] gap-x-4 px-4 py-2.5 items-center ${
                    i > 0 ? "border-t border-primary-fixed/10" : ""
                  } ${log.error ? "bg-error/[0.03]" : ""}`}
                >
                  <span className="font-mono text-[10px] text-primary-fixed/50">{formatTime(log.timestamp)}</span>
                  <span className="font-mono text-sm text-primary-fixed truncate">{log.domain}</span>
                  <span className="font-mono text-[11px] text-secondary-fixed">{formatMs(log.duration_ms)}</span>
                  <span className="font-mono text-sm font-bold text-secondary-fixed">
                    {log.error ? "—" : `${log.score}`}
                    {!log.error && <span className="text-primary-fixed/30 text-[10px]">/100</span>}
                  </span>
                  <span className={`font-mono text-sm font-bold ${log.error ? "text-error/50" : GRADE_CLASS[log.grade]}`}>
                    {log.error ? "[!]" : `[${log.grade}]`}
                  </span>
                  <span className={`font-mono text-[10px] ${log.error ? "text-error/70" : "text-primary-fixed/60"} truncate`}>
                    {log.error ? "ERROR" : log.status}
                  </span>
                  <div className="flex gap-1.5 justify-end">
                    {log.cached && (
                      <span className="font-mono text-[9px] border border-primary-fixed/20 text-primary-fixed/40 px-1">
                        CACHED
                      </span>
                    )}
                    {log.error && (
                      <span className="font-mono text-[9px] border border-error/30 text-error/60 px-1 truncate max-w-[60px]" title={log.error}>
                        ERR
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
