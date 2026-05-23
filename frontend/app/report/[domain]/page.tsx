import { AppShell } from "@/components/layout/AppShell";
import { GuestStoredReport } from "@/components/dashboard/GuestStoredReport";
import { ReportDashboard } from "@/components/dashboard/ReportDashboard";
import { ScanProgressForTarget } from "@/components/scanning/ScanProgress";
import { analyzeDomain, getReportById } from "@/lib/api";
import { normalizeScanTarget } from "@/lib/startScan";

type Props = {
  params:       Promise<{ domain: string }>;
  searchParams: Promise<{ id?: string; guestScanId?: string; liveScanId?: string; liveJobId?: string }>;
};

export default async function ReportPage({ params, searchParams }: Props) {
  const rawParams = await params;
  const domain = normalizeScanTarget(decodeURIComponent(rawParams.domain));
  const { id, guestScanId, liveScanId, liveJobId } = await searchParams;

  if (guestScanId) {
    return <GuestStoredReport domain={domain} scanId={guestScanId} liveJobId={liveJobId} />;
  }

  if (liveScanId) {
    return (
      <AppShell domain={domain}>
        <ScanProgressForTarget target={domain} scanId={liveScanId} />
      </AppShell>
    );
  }

  const response = id
    ? await getReportById(id)
    : await analyzeDomain(domain);

  if (!response.success || !response.data) {
    return (
      <AppShell domain={domain}>
        <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest">
            &gt; SCAN_ERROR
          </span>
          <p className="font-mono text-error text-sm">
            {response.error ?? "Scan failed - unknown error."}
          </p>
          <a href="/scan" className="btn-ghost px-4 py-2 text-xs">
            &gt; TRY_AGAIN
          </a>
        </div>
      </AppShell>
    );
  }

  return (
    <ReportDashboard
      domain={domain}
      report={response.data}
      historyId={id}
    />
  );
}
