"use client";

import { useSyncExternalStore } from "react";
import type { ScanReport } from "@/types";
import { AppShell } from "@/components/layout/AppShell";
import { ReportDashboard } from "@/components/dashboard/ReportDashboard";
import { ScanLink } from "@/components/scan/ScanLink";
import { getGuestScanReport, subscribeGuestScans } from "@/lib/guestScanStorage";

type Props = {
  domain: string;
  scanId: string;
};

export function GuestStoredReport({ domain, scanId }: Props) {
  const report = useSyncExternalStore<ScanReport | null>(
    subscribeGuestScans,
    () => getGuestScanReport(scanId),
    () => null,
  );

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
