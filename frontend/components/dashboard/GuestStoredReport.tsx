"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { ScanJobResponse, ScanReport } from "@/types";
import { AppShell } from "@/components/layout/AppShell";
import { ReportDashboard } from "@/components/dashboard/ReportDashboard";
import { ScanLink } from "@/components/scan/ScanLink";
import { getGuestScanReport, saveGuestScan, subscribeGuestScans } from "@/lib/guestScanStorage";

type Props = {
  domain: string;
  scanId: string;
  liveJobId?: string;
};

export function GuestStoredReport({ domain, scanId, liveJobId }: Props) {
  const screenshotHydratedRef = useRef(false);
  const report = useSyncExternalStore<ScanReport | null>(
    subscribeGuestScans,
    () => getGuestScanReport(scanId),
    () => null,
  );

  useEffect(() => {
    if (!liveJobId || screenshotHydratedRef.current) return;

    const jobId = liveJobId;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    async function pollLateScreenshot() {
      attempts += 1;
      try {
        const res = await fetch(`/api/analyze/jobs/${encodeURIComponent(jobId)}`, {
          cache: "no-store",
        });
        const body = (await res.json()) as ScanJobResponse;
        if (cancelled || !res.ok || !body.success || !body.data?.report) return;

        const screenshotDone = body.data.steps.some((step) => (
          step.key === "screenshot" && step.status !== "running" && step.status !== "pending"
        ));

        if (screenshotDone) {
          screenshotHydratedRef.current = true;
          saveGuestScan(scanId, body.data.report);
          return;
        }

        if (attempts < 30) {
          timer = setTimeout(pollLateScreenshot, 1000);
        }
      } catch {
        if (!cancelled && attempts < 30) {
          timer = setTimeout(pollLateScreenshot, 1500);
        }
      }
    }

    timer = setTimeout(pollLateScreenshot, 1000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [liveJobId, scanId]);

  if (!report) {
    return (
      <AppShell domain={domain}>
        <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest">
            &gt; GUEST_SCAN_NOT_FOUND
          </span>
          <p className="font-mono text-sm text-[#d7e8ff]/70 text-center max-w-xl">
            This guest report is stored only in the browser that created it. It may have been cleared or replaced by newer scans.
          </p>
          <ScanLink target={domain} className="btn-ghost px-4 py-2 text-xs">
            &gt; RESCAN TARGET
          </ScanLink>
        </div>
      </AppShell>
    );
  }

  return <ReportDashboard domain={domain} report={report} guestScanId={scanId} />;
}
