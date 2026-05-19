"use client";

import type { ReactNode }       from "react";
import type { ScanReport }      from "@/types";
import { AppShell }             from "@/components/layout/AppShell";
import { RiskScoreCard }        from "@/components/dashboard/RiskScoreCard";
import { KeySignalsOverview }   from "@/components/dashboard/KeySignalsOverview";
import { DataConfidenceStrip }  from "@/components/dashboard/DataConfidenceStrip";
import { ReportQualitySummary } from "@/components/dashboard/ReportQualitySummary";
import { PriorityFindingsCard } from "@/components/dashboard/PriorityFindingsCard";
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
import { SecurityPostureSummary } from "@/components/dashboard/SecurityPostureSummary";
import { ScreenshotCard }       from "@/components/dashboard/ScreenshotCard";
import { RawDataCard }          from "@/components/dashboard/RawDataCard";
import { ResearchToolsCard }    from "@/components/dashboard/ResearchToolsCard";
import { ScanLink }             from "@/components/scan/ScanLink";
import { AppIcon }              from "@/components/ui/AppIcon";

type Props = {
  domain: string;
  report: ScanReport;
  historyId?: string;
  guestScanId?: string;
};

function ReportSection({
  id,
  title,
  detail,
  children,
}: {
  id: string;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-20">
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

function BalancedGrid({
  children,
  columns = "xl:columns-2 2xl:columns-3",
}: {
  children: ReactNode;
  columns?: string;
}) {
  return (
    <div className={`columns-1 gap-4 md:columns-2 ${columns}`}>
      {children}
    </div>
  );
}

function BalancedItem({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={`mb-4 break-inside-avoid ${wide ? "md:column-span-all" : ""}`}>
      {children}
    </div>
  );
}

export function ReportDashboard({ domain, report, historyId, guestScanId }: Props) {
  const sections = [
    { id: "overview", label: "Overview" },
    { id: "priorities", label: "Priorities" },
    { id: "security", label: "Security" },
    { id: "network", label: "Network" },
    { id: "page", label: "Page" },
    { id: "appendix", label: "Appendix" },
  ];

  return (
    <AppShell domain={domain}>
      <div className="p-4 md:p-6 space-y-6 w-full max-w-[1560px] mx-auto pb-12">
        <div className="md:hidden pb-4 border-b border-primary-fixed/20">
          <span className="font-mono text-[11px] text-primary-fixed/50 uppercase tracking-widest block mb-1">
            TARGET_HOST:
          </span>
          <span className="font-mono text-2xl font-bold text-primary-fixed">{domain}</span>
        </div>

        {(historyId || guestScanId) && (
          <div className="flex items-center gap-2 font-mono text-[10px] text-primary-fixed/40">
            <AppIcon name="history" className="text-[14px]" />
            <span>
              {guestScanId ? "GUEST_BROWSER_SCAN" : "HISTORICAL_SCAN"} - {new Date(report.scanTime).toLocaleString("en-GB")}
            </span>
            <ScanLink
              target={domain}
              className="ml-auto btn-ghost px-3 py-1 text-[10px]"
            >
              RESCAN &gt;
            </ScanLink>
          </div>
        )}

        <nav className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-2 bg-[#070B0F]/90 backdrop-blur border-y border-primary-fixed/10 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="font-mono text-[11px] text-white/65 border border-primary-fixed/15 bg-[#151918] px-3 py-1.5 hover:text-primary-fixed hover:border-primary-fixed/45 transition-colors"
              >
                {section.label}
              </a>
            ))}
          </div>
        </nav>

        <ReportSection id="overview" title="Overview" detail="risk score, scan time, primary signals">
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
          <DataConfidenceStrip report={report} />
          <ReportQualitySummary report={report} />
        </ReportSection>

        <ReportSection id="priorities" title="Risk Priorities" detail="posture observations, then full finding log">
          <PriorityFindingsCard findings={report.findings} />
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            <div className="xl:col-span-7">
              <AdvisoryPanel findings={report.findings} />
            </div>
            <div className="xl:col-span-5">
              <ScreenshotCard screenshot={report.screenshot} />
            </div>
          </div>
        </ReportSection>

        <ReportSection id="security" title="Security Posture" detail="transport, headers, cookies, disclosure">
          <SecurityPostureSummary
            ssl={report.ssl}
            headers={report.headers}
            cookies={report.cookies}
            securityTxt={report.securityTxt}
          />
          <BalancedGrid>
            <BalancedItem wide>
              <SecurityHeadersCard headers={report.headers} />
            </BalancedItem>
            <BalancedItem>
              <SSLCard ssl={report.ssl} />
            </BalancedItem>
            <BalancedItem>
              <CookiesCard cookies={report.cookies} />
            </BalancedItem>
            <BalancedItem>
              <SecurityTxtCard securityTxt={report.securityTxt} />
            </BalancedItem>
          </BalancedGrid>
        </ReportSection>

        <ReportSection id="network" title="Network And Discovery" detail="dns, mail posture, ownership, crawler hints">
          <BalancedGrid>
            <BalancedItem>
              <EmailSecurityCard dns={report.dns} />
            </BalancedItem>
            <BalancedItem>
              <WhoisCard whois={report.whois} />
            </BalancedItem>
            <BalancedItem>
              <SiteDiscoveryCard discovery={report.siteDiscovery} />
            </BalancedItem>
            <BalancedItem wide>
              <DNSRecordsCard dns={report.dns} />
            </BalancedItem>
          </BalancedGrid>
        </ReportSection>

        <ReportSection id="page" title="Page Intelligence" detail="http behavior, redirects, metadata, detected stack">
          <BalancedGrid>
            <BalancedItem>
              <HttpOverviewCard http={report.httpOverview} />
            </BalancedItem>
            <BalancedItem>
              <RedirectsCard http={report.httpOverview} />
            </BalancedItem>
            <BalancedItem>
              <HostNamesCard
                http={report.httpOverview}
                metadata={report.pageMetadata}
                hostname={report.hostname}
              />
            </BalancedItem>
            <BalancedItem>
              <ServerInfoCard http={report.httpOverview} />
            </BalancedItem>
            <BalancedItem>
              <PageMetadataCard metadata={report.pageMetadata} />
            </BalancedItem>
            <BalancedItem>
              <TechStackCard techStack={report.techStack} />
            </BalancedItem>
          </BalancedGrid>
        </ReportSection>

        <ReportSection id="appendix" title="Appendix" detail="export and external validation">
          <RawDataCard report={report} />
          <ResearchToolsCard report={report} />
        </ReportSection>
      </div>
    </AppShell>
  );
}
