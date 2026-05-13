"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const ANALYZERS = [
  { key: "dns",        label: "DNS_RESOLUTION",     icon: "dns"               },
  { key: "ssl",        label: "SSL_CERTIFICATE",    icon: "lock"              },
  { key: "headers",   label: "HTTP_SEC_HEADERS",   icon: "http"              },
  { key: "whois",     label: "WHOIS_LOOKUP",        icon: "person_search"     },
  { key: "techstack", label: "TECH_STACK_DETECT",   icon: "stacks"            },
  { key: "cookies",   label: "COOKIE_ANALYSIS",     icon: "cookie"            },
  { key: "sectxt",    label: "SECURITY_TXT_CHECK",  icon: "security"          },
  { key: "screenshot",label: "SCREENSHOT_CAPTURE",  icon: "screenshot_monitor"},
  { key: "score",     label: "RISK_SCORE_CALC",     icon: "monitoring"        },
] as const;

type AnalyzerKey = (typeof ANALYZERS)[number]["key"];
type Status = "pending" | "running" | "complete";
type StatusMap = Record<AnalyzerKey, Status>;

const TOTAL_SEGMENTS = 20;
// Minimum display time per analyzer row (ms) — purely visual
const ROW_DURATION = 600;

export function ScanProgress({ target }: { target: string }) {
  const router = useRouter();
  const initialized = useRef(false);

  const [statuses, setStatuses] = useState<StatusMap>(
    () => Object.fromEntries(ANALYZERS.map((a) => [a.key, "pending"])) as StatusMap
  );
  const [scanDone, setScanDone] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Elapsed counter
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 100), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Start the real scan in parallel with the animation
    const scanPromise = fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    }).then((r) => r.json());

    // Visual animation — runs through each analyzer row sequentially
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cursor = 200;

    ANALYZERS.forEach((analyzer, idx) => {
      const runAt  = cursor;
      cursor      += ROW_DURATION;
      const doneAt = cursor;

      timers.push(
        setTimeout(() => setStatuses((prev) => ({ ...prev, [analyzer.key]: "running" })), runAt),
        setTimeout(() => {
          setStatuses((prev) => ({ ...prev, [analyzer.key]: "complete" }));

          // After the last animation row, wait for the real scan to finish
          if (idx === ANALYZERS.length - 1) {
            scanPromise.then((data) => {
              if (!data.success) {
                setScanError(data.error ?? "Scan failed — unknown error.");
                return;
              }
              setScanDone(true);
              setTimeout(() => router.push(`/report/${encodeURIComponent(target)}`), 800);
            }).catch((err) => {
              setScanError(err instanceof Error ? err.message : "Network error");
            });
          }
        }, doneAt),
      );
    });

    return () => timers.forEach(clearTimeout);
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
              <span className={scanDone ? "text-primary-fixed" : scanError ? "text-error" : "text-primary-fixed/60"}>
                {scanDone ? "SCAN_COMPLETE" : scanError ? "SCAN_FAILED" : "SCANNING_IN_PROGRESS"}
              </span>
              <span className="text-primary-fixed/60">{progress}%</span>
            </div>
            <div className="w-full h-3 bg-[#0A0F13] border border-primary-fixed/20 flex overflow-hidden">
              {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r border-[#070B0F] last:border-r-0 transition-colors duration-200 ${
                    i < filledSegs
                      ? scanError ? "bg-error/70" : "bg-primary-fixed"
                      : "bg-transparent"
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

          {/* Error banner */}
          {scanError && (
            <div className="border border-error/40 bg-error/5 px-5 py-4 flex items-center gap-4">
              <span className="material-symbols-outlined text-error text-2xl shrink-0">
                error
              </span>
              <div className="min-w-0">
                <p className="font-mono text-sm text-error font-semibold tracking-wider">
                  SCAN_FAILED
                </p>
                <p className="font-mono text-[11px] text-error/70 mt-1 break-all">
                  &gt; {scanError}
                </p>
              </div>
              <a href="/scan" className="ml-auto btn-ghost px-3 py-1.5 text-xs shrink-0">
                RETRY
              </a>
            </div>
          )}

          {/* Waiting for real scan after animation completes */}
          {completedCount === ANALYZERS.length && !scanDone && !scanError && (
            <p className="font-mono text-[11px] text-primary-fixed/40 text-center animate-pulse">
              &gt; AWAITING_BACKEND_RESPONSE...
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
