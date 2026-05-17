import type { ReactNode }       from "react";
import { AppShell }             from "@/components/layout/AppShell";
import { RiskScoreCard }        from "@/components/dashboard/RiskScoreCard";
import { KeySignalsOverview }   from "@/components/dashboard/KeySignalsOverview";
import { AdvisoryPanel }        from "@/components/dashboard/AdvisoryPanel";
import { SSLCard }              from "@/components/dashboard/SSLCard";
import { TechStackCard }        from "@/components/dashboard/TechStackCard";
import { SecurityHeadersCard }  from "@/components/dashboard/SecurityHeadersCard";
import { HttpOverviewCard }     from "@/components/dashboard/HttpOverviewCard";
import { HostNamesCard }        from "@/components/dashboard/HostNamesCard";
import { PageMetadataCard }     from "@/components/dashboard/PageMetadataCard";
import { RedirectsCard }        from "@/components/dashboard/RedirectsCard";
import { ServerInfoCard }       from "@/components/dashboard/ServerInfoCard";
import { SiteDiscoveryCard }    from "@/components/dashboard/SiteDiscoveryCard";
import { DNSRecordsCard }       from "@/components/dashboard/DNSRecordsCard";
import { EmailSecurityCard }    from "@/components/dashboard/EmailSecurityCard";
import { WhoisCard }            from "@/components/dashboard/WhoisCard";
import { CookiesCard }          from "@/components/dashboard/CookiesCard";
import { SecurityTxtCard }      from "@/components/dashboard/SecurityTxtCard";
import { ScreenshotCard }       from "@/components/dashboard/ScreenshotCard";
import { RawDataCard }          from "@/components/dashboard/RawDataCard";
import { ResearchToolsCard }    from "@/components/dashboard/ResearchToolsCard";
import { ScanLink }             from "@/components/scan/ScanLink";
import { AppIcon }              from "@/components/ui/AppIcon";
import { analyzeDomain, getReportById } from "@/lib/api";
import { normalizeScanTarget }  from "@/lib/startScan";

type Props = {
  params:       Promise<{ domain: string }>;
  searchParams: Promise<{ id?: string }>;
};

function ReportSection({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4 border-b border-primary-fixed/15 pb-2">
        <h2 className="font-mono text-[13px] text-white uppercase tracking-widest">
          {title}
        </h2>
        <span className="font-mono text-[10px] text-primary-fixed/60 uppercase tracking-widest text-right">
          {detail}
        </span>
      </div>
      {children}
    </section>
  );
}

export default async function ReportPage({ params, searchParams }: Props) {
  const rawParams = await params;
  const domain = normalizeScanTarget(decodeURIComponent(rawParams.domain));
  const { id } = await searchParams;

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

  const report = response.data;

  return (
    <AppShell domain={domain}>
      <div className="p-4 md:p-6 space-y-6 w-full max-w-[1440px] mx-auto pb-12">
        <div className="md:hidden pb-4 border-b border-primary-fixed/20">
          <span className="font-mono text-[11px] text-primary-fixed/50 uppercase tracking-widest block mb-1">
            TARGET_HOST:
          </span>
          <span className="font-mono text-2xl font-bold text-primary-fixed">{domain}</span>
        </div>

        {id && (
          <div className="flex items-center gap-2 font-mono text-[10px] text-primary-fixed/40">
            <AppIcon name="history" className="text-[14px]" />
            <span>HISTORICAL_SCAN - {new Date(report.scanTime).toLocaleString("en-GB")}</span>
            <ScanLink
              target={domain}
              className="ml-auto btn-ghost px-3 py-1 text-[10px]"
            >
              RESCAN &gt;
            </ScanLink>
          </div>
        )}

        <ReportSection title="Overview" detail="risk and primary signals">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
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
        </ReportSection>

        <ReportSection title="Findings And Capture" detail="issues plus visual context">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
            <div className="xl:col-span-7">
              <AdvisoryPanel findings={report.findings} />
            </div>
            <div className="xl:col-span-5">
              <ScreenshotCard screenshot={report.screenshot} />
            </div>
          </div>
        </ReportSection>

        <ReportSection title="Security Posture" detail="transport, headers, cookies, disclosure">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
            <div className="xl:col-span-2">
              <SecurityHeadersCard headers={report.headers} />
            </div>
            <SSLCard ssl={report.ssl} />
            <CookiesCard cookies={report.cookies} />
            <SecurityTxtCard securityTxt={report.securityTxt} />
          </div>
        </ReportSection>

        <ReportSection title="Infrastructure And Discovery" detail="dns, mail posture, ownership, crawler hints">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            <EmailSecurityCard dns={report.dns} />
            <WhoisCard whois={report.whois} />
            <SiteDiscoveryCard discovery={report.siteDiscovery} />
          </div>
          <DNSRecordsCard dns={report.dns} />
        </ReportSection>

        <ReportSection title="Page Intelligence" detail="http behavior, metadata, detected stack">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
            <HttpOverviewCard http={report.httpOverview} />
            <RedirectsCard http={report.httpOverview} />
            <HostNamesCard
              http={report.httpOverview}
              metadata={report.pageMetadata}
              hostname={report.hostname}
            />
            <ServerInfoCard http={report.httpOverview} />
            <PageMetadataCard metadata={report.pageMetadata} />
            <TechStackCard techStack={report.techStack} />
          </div>
        </ReportSection>

        <ReportSection title="Appendix" detail="export and external validation">
          <RawDataCard report={report} />
          <ResearchToolsCard report={report} />
        </ReportSection>
      </div>
    </AppShell>
  );
}
