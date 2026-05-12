"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const ANALYZERS = [
  { key: "dns",        label: "DNS_RESOLUTION",     icon: "dns",               delay: 500  },
  { key: "ssl",        label: "SSL_CERTIFICATE",    icon: "lock",              delay: 650  },
  { key: "headers",   label: "HTTP_SEC_HEADERS",   icon: "http",              delay: 550  },
  { key: "whois",     label: "WHOIS_LOOKUP",        icon: "person_search",     delay: 750  },
  { key: "techstack", label: "TECH_STACK_DETECT",   icon: "stacks",            delay: 600  },
  { key: "cookies",   label: "COOKIE_ANALYSIS",     icon: "cookie",            delay: 300  },
  { key: "sectxt",    label: "SECURITY_TXT_CHECK",  icon: "security",          delay: 280  },
  { key: "screenshot",label: "SCREENSHOT_CAPTURE",  icon: "screenshot_monitor",delay: 1050 },
  { key: "score",     label: "RISK_SCORE_CALC",     icon: "monitoring",        delay: 420  },
] as const;

type AnalyzerKey = (typeof ANALYZERS)[number]["key"];
type Status = "pending" | "running" | "complete";
type StatusMap = Record<AnalyzerKey, Status>;

const TOTAL_SEGMENTS = 20;

export function ScanProgress({ target }: { target: string }) {
  const router = useRouter();
  const initialized = useRef(false);

  const [statuses, setStatuses] = useState<StatusMap>(
    () => Object.fromEntries(ANALYZERS.map((a) => [a.key, "pending"])) as StatusMap
  );
  const [scanDone, setScanDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Tick elapsed counter
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 100), 100);
    return () => clearInterval(id);
  }, []);

  // Run analyzer sequence once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let cumulative = 300;

    ANALYZERS.forEach((analyzer, idx) => {
      const runAt  = cumulative;
      cumulative  += analyzer.delay;
      const doneAt = cumulative;

      setTimeout(() => {
        setStatuses((prev) => ({ ...prev, [analyzer.key]: "running" }));
      }, runAt);

      setTimeout(() => {
        setStatuses((prev) => ({ ...prev, [analyzer.key]: "complete" }));

        if (idx === ANALYZERS.length - 1) {
          setTimeout(() => {
            setScanDone(true);
            setTimeout(() => {
              router.push(`/report/${encodeURIComponent(target)}`);
            }, 900);
          }, 350);
        }
      }, doneAt);
    });
  }, [target, router]);

  const completedCount = Object.values(statuses).filter((s) => s === "complete").length;
  const progress       = Math.round((completedCount / ANALYZERS.length) * 100);
  const filledSegs     = Math.round((completedCount / ANALYZERS.length) * TOTAL_SEGMENTS);
  const elapsedSec     = (elapsed / 1000).toFixed(1);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="w-full max-w-2xl card-panel">

        {/* Panel header */}
        <div className="border-b border-primary-fixed/20 px-6 py-3 bg-[#070B0F] flex justify-between items-center">
          <span className="font-mono text-[11px] tracking-widest text-primary-fixed/70 uppercase">
            SYS.SCAN_PROCESS
          </span>
          <span className="font-mono text-[11px] text-primary-fixed/40">
            T+{elapsedSec}s
          </span>
        </div>

        <div className="p-6 space-y-6">

          {/* Target */}
          <div>
            <p className="font-mono text-[11px] text-primary-fixed/50 uppercase tracking-widest mb-1">
              TARGET_HOST:
            </p>
            <p className="font-mono text-2xl font-bold text-primary-fixed tracking-tight break-all">
              {target}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-[11px] uppercase tracking-wider">
              <span className={scanDone ? "text-primary-fixed" : "text-primary-fixed/60"}>
                {scanDone ? "SCAN_COMPLETE" : "SCANNING_IN_PROGRESS"}
              </span>
              <span className="text-primary-fixed/60">{progress}%</span>
            </div>
            <div className="w-full h-3 bg-[#0A0F13] border border-primary-fixed/20 flex overflow-hidden">
              {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r border-[#070B0F] last:border-r-0 transition-colors duration-200 ${
                    i < filledSegs ? "bg-primary-fixed" : "bg-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Analyzer rows */}
          <div className="border border-primary-fixed/10">
            {ANALYZERS.map((analyzer, idx) => {
              const status = statuses[analyzer.key];
              const isLast = idx === ANALYZERS.length - 1;

              return (
                <div
                  key={analyzer.key}
                  className={`flex items-center justify-between px-4 py-2.5 ${
                    !isLast ? "border-b border-primary-fixed/10" : ""
                  } ${status === "running" ? "bg-primary-fixed/[0.04]" : ""}`}
                >
                  {/* Left: status prefix + label */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`font-mono text-[12px] font-bold shrink-0 w-8 ${
                        status === "complete" ? "text-primary-fixed" :
                        status === "running"  ? "text-primary-fixed animate-pulse" :
                        "text-on-surface-variant/30"
                      }`}
                    >
                      {status === "complete" ? "[✓]" :
                       status === "running"  ? "[►]" :
                                              "[-]"}
                    </span>
                    <span
                      className={`font-mono text-[13px] tracking-wider truncate ${
                        status === "complete" ? "text-primary-fixed" :
                        status === "running"  ? "text-on-surface" :
                        "text-on-surface-variant/35"
                      }`}
                    >
                      {analyzer.label}
                    </span>
                  </div>

                  {/* Right: status text */}
                  <span
                    className={`font-mono text-[11px] uppercase shrink-0 ml-4 ${
                      status === "complete" ? "text-primary-fixed" :
                      status === "running"  ? "text-secondary animate-pulse" :
                      "text-on-surface-variant/25"
                    }`}
                  >
                    {status === "complete" ? "COMPLETE" :
                     status === "running"  ? "RUNNING..." :
                                            "PENDING"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Scan complete banner */}
          {scanDone && (
            <div className="border border-primary-fixed/40 bg-primary-fixed/5 px-5 py-4 flex items-center gap-4">
              <span className="material-symbols-outlined text-primary-fixed text-2xl shrink-0">
                check_circle
              </span>
              <div>
                <p className="font-mono text-sm text-primary-fixed font-semibold tracking-wider">
                  SCAN_COMPLETE — {ANALYZERS.length} modules processed
                </p>
                <p className="font-mono text-[11px] text-primary-fixed/50 mt-1">
                  &gt; Redirecting to report dashboard...
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
