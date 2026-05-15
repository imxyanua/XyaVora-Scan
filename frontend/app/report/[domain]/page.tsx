import { AppShell }             from "@/components/layout/AppShell";
import { RiskScoreCard }        from "@/components/dashboard/RiskScoreCard";
import { KeySignalsOverview }   from "@/components/dashboard/KeySignalsOverview";
import { AdvisoryPanel }        from "@/components/dashboard/AdvisoryPanel";
import { SSLCard }              from "@/components/dashboard/SSLCard";
import { TechStackCard }        from "@/components/dashboard/TechStackCard";
import { SecurityHeadersCard }  from "@/components/dashboard/SecurityHeadersCard";
import { DNSRecordsCard }       from "@/components/dashboard/DNSRecordsCard";
import { WhoisCard }            from "@/components/dashboard/WhoisCard";
import { CookiesCard }          from "@/components/dashboard/CookiesCard";
import { SecurityTxtCard }      from "@/components/dashboard/SecurityTxtCard";
import { ScreenshotCard }       from "@/components/dashboard/ScreenshotCard";
import { ScanLink }             from "@/components/scan/ScanLink";
import { AppIcon }              from "@/components/ui/AppIcon";
import { analyzeDomain, getReportById } from "@/lib/api";

type Props = {
  params:       Promise<{ domain: string }>;
  searchParams: Promise<{ id?: string }>;
};

export default async function ReportPage({ params, searchParams }: Props) {
  const { domain } = await params;
  const { id }     = await searchParams;

  // If ?id= is present, load the stored historical report instead of re-scanning.
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
            {response.error ?? "Scan failed — unknown error."}
          </p>
          <a href="/scan" className="btn-ghost px-4 py-2 text-xs">
            &gt; TRY_AGAIN
          </a>
        </div>
      </AppShell>
    );
  }

  const report = response.data;

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

        {/* Historical scan badge */}
        {id && (
          <div className="flex items-center gap-2 font-mono text-[10px] text-primary-fixed/40">
            <AppIcon name="history" className="text-[14px]" />
            <span>HISTORICAL_SCAN · {new Date(report.scanTime).toLocaleString("en-GB")}</span>
            <ScanLink
              target={domain}
              className="ml-auto btn-ghost px-3 py-1 text-[10px]"
            >
              RESCAN &gt;
            </ScanLink>
          </div>
        )}

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
          <div className="md:col-span-5 lg:col-span-4">
            <AdvisoryPanel findings={report.findings} />
          </div>
          <div className="md:col-span-7 lg:col-span-8 grid grid-cols-1 lg:grid-cols-2 gap-4 content-start">
            <SSLCard ssl={report.ssl} />
            <WhoisCard whois={report.whois} />
            <div className="lg:col-span-2">
              <TechStackCard techStack={report.techStack} />
            </div>
            <div className="lg:col-span-2">
              <SecurityHeadersCard headers={report.headers} />
            </div>
          </div>
        </div>

        {/* ── Row 3: DNS ── */}
        <DNSRecordsCard dns={report.dns} />

        {/* ── Row 4: Cookies + Security.txt + Screenshot ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CookiesCard cookies={report.cookies} />
          <SecurityTxtCard securityTxt={report.securityTxt} />
          <ScreenshotCard screenshot={report.screenshot} />
        </div>

      </div>
    </AppShell>
  );
}
