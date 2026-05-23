"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ScanJobResponse, ScanJobSnapshot, ScanJobStep, ScanJobStepState } from "@/types";
import { LiveReportPreview } from "@/components/dashboard/LiveReportPreview";
import { AppIcon } from "@/components/ui/AppIcon";
import { saveGuestScan } from "@/lib/guestScanStorage";
import { normalizeScanTarget } from "@/lib/startScan";

const FALLBACK_STEPS: ScanJobStep[] = [
  { key: "dns", label: "DNS Records", status: "pending" },
  { key: "ssl", label: "SSL Certificate", status: "pending" },
  { key: "headers", label: "Security Headers", status: "pending" },
  { key: "http", label: "HTTP Overview", status: "pending" },
  { key: "location", label: "Server Location", status: "pending" },
  { key: "metadata", label: "Page Metadata", status: "pending" },
  { key: "discovery", label: "Crawl Discovery", status: "pending" },
  { key: "whois", label: "WHOIS Lookup", status: "pending" },
  { key: "techStack", label: "Tech Stack", status: "pending" },
  { key: "cookies", label: "Cookies", status: "pending" },
  { key: "securityTxt", label: "security.txt", status: "pending" },
  { key: "screenshot", label: "Screenshot Capture", status: "pending" },
  { key: "score", label: "Risk Score", status: "pending" },
];

const STEP_ICONS: Record<string, string> = {
  dns: "dns",
  ssl: "lock",
  headers: "http",
  http: "public",
  location: "location_on",
  metadata: "article",
  discovery: "travel_explore",
  whois: "person_search",
  techStack: "stacks",
  cookies: "cookie",
  securityTxt: "security",
  screenshot: "screenshot_monitor",
  score: "monitoring",
};

const TOTAL_SEGMENTS = 30;

type ScanSessionProps = {
  target: string;
  scanId: string;
};

export function ScanProgress() {
  const searchParams = useSearchParams();
  const target = normalizeScanTarget(searchParams.get("target") ?? "") || "unknown";
  const scanId = searchParams.get("scanId") ?? "manual";

  return <ScanProgressForTarget target={target} scanId={scanId} />;
}

export function ScanProgressForTarget({ target, scanId }: ScanSessionProps) {
  const scanKey = `${target}:${scanId}`;

  return <ScanSession key={scanKey} target={target} scanId={scanId} />;
}

function ScanSession({ target, scanId }: ScanSessionProps) {
  const router = useRouter();
  const startedRef = useRef<string | null>(null);
  const redirectedRef = useRef(false);

  const [job, setJob] = useState<ScanJobSnapshot | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 250), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (target === "unknown") return;

    const scanKey = `${target}:${scanId}`;
    if (startedRef.current === scanKey) return;
    startedRef.current = scanKey;
    redirectedRef.current = false;
    setJob(null);
    setScanError(null);
    setElapsed(0);

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function fetchJson(url: string, init?: RequestInit): Promise<ScanJobResponse> {
      const res = await fetch(url, init);
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return body as ScanJobResponse;
    }

    async function poll(jobId: string) {
      try {
        const body = await fetchJson(`/api/analyze/jobs/${encodeURIComponent(jobId)}`);
        if (cancelled || !body.data) return;

        setJob(body.data);

        if (body.data.status === "failed") {
          setScanError(body.data.error ?? "Scan failed.");
          return;
        }

        if (body.data.status === "completed") {
          const completedJob = body.data;
          if (completedJob.report) {
            saveGuestScan(scanId, completedJob.report);
          }
          if (!redirectedRef.current) {
            redirectedRef.current = true;
            pollTimer = setTimeout(() => {
              router.push(
                `/report/${encodeURIComponent(target)}?guestScanId=${encodeURIComponent(scanId)}&liveJobId=${encodeURIComponent(completedJob.job_id)}`,
              );
            }, 700);
          }
          return;
        }

        pollTimer = setTimeout(() => poll(jobId), 800);
      } catch (err) {
        if (!cancelled) {
          setScanError(err instanceof Error ? err.message : "Could not read scan progress.");
        }
      }
    }

    async function start() {
      try {
        const body = await fetchJson("/api/analyze/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, force_refresh: true, save_history: false }),
        });
        if (cancelled || !body.data) return;
        setJob(body.data);
        poll(body.data.job_id);
      } catch (err) {
        if (!cancelled) {
          setScanError(err instanceof Error ? err.message : "Could not start scan.");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [target, scanId, router]);

  const steps = job?.steps.length ? job.steps : FALLBACK_STEPS;
  const progress = job?.progress ?? (scanError ? 100 : 3);
  const filledSegs = Math.max(1, Math.round((progress / 100) * TOTAL_SEGMENTS));
  const elapsedMs = job?.elapsed_ms ?? elapsed;
  const elapsedSec = (elapsedMs / 1000).toFixed(1);
  const doneCount = steps.filter((step) => step.status === "success").length;
  const errorCount = steps.filter((step) => step.status === "error").length;
  const hasModuleErrors = errorCount > 0;
  const runningStep = job?.status === "completed"
    ? undefined
    : steps.find((step) => step.status === "running");
  const currentLabel = runningStep?.label ?? (
    job?.status === "completed"
      ? hasModuleErrors
        ? "Report ready with module errors"
        : "Report ready"
      : "Preparing scan job"
  );
  const slowScan = elapsedMs > 10000 && job?.status !== "completed" && !scanError;

  const statusLabel = useMemo(() => {
    if (scanError || job?.status === "failed") return "SCAN_FAILED";
    if (job?.status === "completed") return hasModuleErrors ? "REPORT_READY_WITH_WARNINGS" : "REPORT_READY";
    if (job?.status === "queued") return "QUEUED";
    return "SCANNING_IN_PROGRESS";
  }, [job?.status, scanError, hasModuleErrors]);

  return (
    <div className="w-full max-w-[1560px] mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="w-full card-panel">
        <div className="border-b border-primary-fixed/20 px-6 py-3 bg-[#070B0F] flex justify-between items-center gap-4">
          <span className="font-mono text-[11px] tracking-widest text-primary-fixed/70 uppercase">
            REALTIME_SCAN_JOB
          </span>
          <span className="font-mono text-[11px] text-primary-fixed/40">
            T+{elapsedSec}s
          </span>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-primary-fixed/50 uppercase tracking-widest mb-1">
                Target
              </p>
              <p className="font-mono text-2xl font-bold text-primary-fixed tracking-tight break-all">
                {target}
              </p>
            </div>
            <div className="font-mono text-[11px] text-on-surface-variant md:text-right">
              <p>{job?.job_id ? `JOB ${job.job_id.slice(0, 8).toUpperCase()}` : "STARTING JOB"}</p>
              <p className="text-primary-fixed/60">{doneCount} done / {errorCount} error / {steps.length} modules</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between font-mono text-[11px] uppercase tracking-wider">
              <span className={scanError ? "text-error" : hasModuleErrors && job?.status === "completed" ? "text-secondary" : "text-primary-fixed"}>
                {statusLabel}
              </span>
              <span className="text-primary-fixed/60">{progress}%</span>
            </div>
            <div className="w-full h-3 bg-[#0A0F13] border border-primary-fixed/20 flex overflow-hidden">
              {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r border-[#070B0F] last:border-r-0 transition-colors duration-500 ${
                    i < filledSegs
                      ? scanError
                        ? "bg-error/70"
                        : "bg-primary-fixed"
                      : "bg-transparent"
                  }`}
                />
              ))}
            </div>
            <p className="font-mono text-[11px] text-primary-fixed/50">
              &gt; {currentLabel}
              {slowScan ? " is taking longer than usual, still working..." : ""}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {steps.map((step) => (
              <ScanStepRow key={step.key} step={step} />
            ))}
          </div>

          {job?.status === "completed" && (
            <div className={`border px-5 py-4 flex items-center gap-4 ${
              hasModuleErrors
                ? "border-secondary/40 bg-secondary/5"
                : "border-primary-fixed/40 bg-primary-fixed/5"
            }`}>
              <AppIcon
                name={hasModuleErrors ? "report_problem" : "check_circle"}
                className={`${hasModuleErrors ? "text-secondary" : "text-primary-fixed"} text-2xl shrink-0`}
              />
              <div>
                <p className={`font-mono text-sm font-semibold tracking-wider ${
                  hasModuleErrors ? "text-secondary" : "text-primary-fixed"
                }`}>
                  {hasModuleErrors ? "REPORT_READY_WITH_WARNINGS" : "REPORT_READY"}
                </p>
                <p className="font-mono text-[11px] text-primary-fixed/50 mt-1">
                  &gt; {hasModuleErrors
                    ? `${errorCount} module${errorCount === 1 ? "" : "s"} returned errors. Opening report with available data...`
                    : "Opening report dashboard..."}
                </p>
              </div>
            </div>
          )}

          {scanError && (
            <div className="border border-error/40 bg-error/5 px-5 py-4 flex items-center gap-4">
              <AppIcon name="error" className="text-error text-2xl shrink-0" />
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
        </div>
      </div>
      <LiveReportPreview hostname={target} steps={steps} />
    </div>
  );
}

function ScanStepRow({ step }: { step: ScanJobStep }) {
  return (
    <div
      className={`min-w-0 border px-3 py-2.5 transition-colors duration-300 ${
        step.status === "running"
          ? "border-primary-fixed/35 bg-primary-fixed/[0.05]"
          : step.status === "error"
            ? "border-error/30 bg-error/[0.04]"
            : "border-primary-fixed/10 bg-[#070B0F]/40"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <AppIcon
          name={STEP_ICONS[step.key] ?? "radio_button_checked"}
          className={`text-lg shrink-0 ${statusColor(step.status)}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className={`font-mono text-[13px] font-bold truncate ${statusColor(step.status)}`}>
              {step.label}
            </p>
            <span className={`font-mono text-[10px] uppercase shrink-0 ${statusColor(step.status)}`}>
              {statusText(step.status)}
            </span>
          </div>
          <p className="font-mono text-[10px] text-on-surface-variant/70 truncate mt-1">
            {step.error
              ? step.error
              : step.duration_ms !== undefined
                ? `Completed in ${step.duration_ms} ms`
                : step.status === "running"
                  ? "Analyzer is running..."
                  : "Waiting for analyzer"}
          </p>
        </div>
      </div>
    </div>
  );
}

function statusText(status: ScanJobStepState) {
  if (status === "success") return "Done";
  if (status === "error") return "Error";
  if (status === "running") return "Running";
  return "Pending";
}

function statusColor(status: ScanJobStepState) {
  if (status === "success") return "text-primary-fixed";
  if (status === "error") return "text-error";
  if (status === "running") return "text-secondary animate-pulse";
  return "text-on-surface-variant/45";
}
