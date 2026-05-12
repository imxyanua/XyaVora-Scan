// MOCK: using mock data until backend is ready
import { AppShell }             from "@/components/layout/AppShell";
import { RiskScoreCard }        from "@/components/dashboard/RiskScoreCard";
import { KeySignalsOverview }   from "@/components/dashboard/KeySignalsOverview";
import { AdvisoryPanel }        from "@/components/dashboard/AdvisoryPanel";
import { SSLCard }              from "@/components/dashboard/SSLCard";
import { TechStackCard }        from "@/components/dashboard/TechStackCard";
import { SecurityHeadersCard }  from "@/components/dashboard/SecurityHeadersCard";
import { DNSRecordsCard }       from "@/components/dashboard/DNSRecordsCard";
import { ScreenshotCard }       from "@/components/dashboard/ScreenshotCard";
import { mockGoogleReport }     from "@/mock/googleReport";

type Props = { params: Promise<{ domain: string }> };

export default async function ReportPage({ params }: Props) {
  const { domain } = await params;

  // TODO: replace with real API call → await analyzeDomain(domain)
  const report = mockGoogleReport;

  return (
    <AppShell domain={domain}>
      <div className="p-4 md:p-6 space-y-4 w-full max-w-[1440px] mx-auto pb-12">

        {/* Mobile target label */}
        <div className="md:hidden pb-4 border-b border-primary-fixed/20">
          <span className="font-mono text-[11px] text-primary-fixed/50 uppercase tracking-widest block mb-1">
            TARGET_HOST:
          </span>
          <span className="font-mono text-2xl font-bold text-primary-fixed">{domain}</span>
        </div>

        {/* ── Row 1: Score + Key Signals ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <RiskScoreCard
              score={report.score}
              grade={report.grade}
              status={report.status}
              scanTime={report.scanTime}
            />
          </div>
          <div className="lg:col-span-8">
            <KeySignalsOverview
              headers={report.headers}
              dns={report.dns}
              ssl={report.ssl}
            />
          </div>
        </div>

        {/* ── Row 2: Advisory + Technical panels ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Advisory panel */}
          <div className="md:col-span-5 lg:col-span-4">
            <AdvisoryPanel findings={report.findings} />
          </div>

          {/* Technical panels grid */}
          <div className="md:col-span-7 lg:col-span-8 grid grid-cols-1 lg:grid-cols-2 gap-4 content-start">
            <SSLCard ssl={report.ssl} />
            <TechStackCard techStack={report.techStack} />
            <div className="lg:col-span-2">
              <SecurityHeadersCard headers={report.headers} />
            </div>
          </div>
        </div>

        {/* ── Row 3: DNS + Screenshot ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <DNSRecordsCard dns={report.dns} />
          </div>
          <ScreenshotCard screenshot={report.screenshot} />
        </div>

      </div>
    </AppShell>
  );
}
