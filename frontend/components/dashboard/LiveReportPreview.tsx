"use client";

import type { ReactNode } from "react";
import type {
  CookieResult,
  DnsResult,
  HeadersResult,
  HttpOverviewResult,
  PageMetadataResult,
  ScanJobStep,
  ScreenshotResult,
  SecurityTxtResult,
  ServerLocationResult,
  SiteDiscoveryResult,
  SslResult,
  TechStackItem,
  WhoisResult,
} from "@/types";
import { CookiesCard } from "@/components/dashboard/CookiesCard";
import { CSPAuditCard } from "@/components/dashboard/CSPAuditCard";
import { DNSRecordsCard } from "@/components/dashboard/DNSRecordsCard";
import { DNSSECCard } from "@/components/dashboard/DNSSECCard";
import { EmailSecurityCard } from "@/components/dashboard/EmailSecurityCard";
import { HostNamesCard } from "@/components/dashboard/HostNamesCard";
import { HttpOverviewCard } from "@/components/dashboard/HttpOverviewCard";
import { HstsCard } from "@/components/dashboard/HstsCard";
import { PageMetadataCard } from "@/components/dashboard/PageMetadataCard";
import { RedirectsCard } from "@/components/dashboard/RedirectsCard";
import { ScreenshotCard } from "@/components/dashboard/ScreenshotCard";
import { SecurityHeadersCard } from "@/components/dashboard/SecurityHeadersCard";
import { SecurityTxtCard } from "@/components/dashboard/SecurityTxtCard";
import { ServerInfoCard } from "@/components/dashboard/ServerInfoCard";
import { ServerLocationCard } from "@/components/dashboard/ServerLocationCard";
import { SiteDiscoveryCard } from "@/components/dashboard/SiteDiscoveryCard";
import { SSLCard } from "@/components/dashboard/SSLCard";
import { TechStackCard } from "@/components/dashboard/TechStackCard";
import { TLSSecurityAuditCard } from "@/components/dashboard/TLSSecurityAuditCard";
import { WhoisCard } from "@/components/dashboard/WhoisCard";
import { AppIcon } from "@/components/ui/AppIcon";

type Props = {
  hostname: string;
  steps: ScanJobStep[];
};

type StepMap = Record<string, ScanJobStep | undefined>;

const EMPTY_METADATA: PageMetadataResult = {
  robotsDirectives: [],
  metadataEvidence: [],
  noindex: false,
  nofollow: false,
};

export function LiveReportPreview({ hostname, steps }: Props) {
  const stepMap = Object.fromEntries(steps.map((step) => [step.key, step])) as StepMap;
  const dns = dataOf<DnsResult>(stepMap.dns);
  const ssl = dataOf<SslResult>(stepMap.ssl);
  const headers = dataOf<HeadersResult>(stepMap.headers);
  const http = dataOf<HttpOverviewResult>(stepMap.http);
  const location = dataOf<ServerLocationResult>(stepMap.location);
  const metadata = dataOf<PageMetadataResult>(stepMap.metadata);
  const discovery = dataOf<SiteDiscoveryResult>(stepMap.discovery);
  const whois = dataOf<WhoisResult>(stepMap.whois);
  const techStack = dataOf<TechStackItem[]>(stepMap.techStack);
  const cookies = dataOf<CookieResult[]>(stepMap.cookies);
  const securityTxt = dataOf<SecurityTxtResult>(stepMap.securityTxt);
  const screenshot = dataOf<ScreenshotResult>(stepMap.screenshot);

  return (
    <div className="space-y-6">
      <LiveOverviewPanel
        steps={steps}
        dns={dns}
        ssl={ssl}
        headers={headers}
        http={http}
      />

      <LiveSection title="Security Posture" detail="cards appear when analyzers finish">
        <LiveGrid>
          <LiveCard step={stepMap.ssl}>
            {ssl && <SSLCard ssl={ssl} />}
          </LiveCard>
          <LiveCard step={stepMap.ssl}>
            {ssl && <TLSSecurityAuditCard ssl={ssl} />}
          </LiveCard>
          <LiveCard step={stepMap.headers} wide>
            {headers && <SecurityHeadersCard headers={headers} />}
          </LiveCard>
          <LiveCard step={stepMap.headers}>
            {headers && <CSPAuditCard headers={headers} />}
          </LiveCard>
          <LiveCard step={stepMap.headers}>
            {headers && <HstsCard headers={headers} />}
          </LiveCard>
          <LiveCard step={stepMap.cookies}>
            {cookies && <CookiesCard cookies={cookies} />}
          </LiveCard>
          <LiveCard step={stepMap.securityTxt}>
            {securityTxt && <SecurityTxtCard securityTxt={securityTxt} />}
          </LiveCard>
        </LiveGrid>
      </LiveSection>

      <LiveSection title="Network And Discovery" detail="dns, location, ownership, crawler hints">
        <LiveGrid>
          <LiveCard step={stepMap.location}>
            {location && <ServerLocationCard location={location} />}
          </LiveCard>
          <LiveCard step={stepMap.dns}>
            {dns && <EmailSecurityCard dns={dns} />}
          </LiveCard>
          <LiveCard step={stepMap.dns}>
            {dns && <DNSSECCard dns={dns} whois={whois} />}
          </LiveCard>
          <LiveCard step={stepMap.whois}>
            {whois && <WhoisCard whois={whois} />}
          </LiveCard>
          <LiveCard step={stepMap.discovery}>
            {discovery && <SiteDiscoveryCard discovery={discovery} />}
          </LiveCard>
          <LiveCard step={stepMap.dns} wide>
            {dns && <DNSRecordsCard dns={dns} />}
          </LiveCard>
        </LiveGrid>
      </LiveSection>

      <LiveSection title="Page Intelligence" detail="http behavior, redirects, metadata, stack">
        <LiveGrid>
          <LiveCard step={stepMap.http}>
            {http && <HttpOverviewCard http={http} />}
          </LiveCard>
          <LiveCard step={stepMap.http}>
            {http && <RedirectsCard http={http} />}
          </LiveCard>
          <LiveCard step={stepMap.http}>
            {http && (
              <HostNamesCard
                http={http}
                metadata={metadata ?? EMPTY_METADATA}
                hostname={hostname}
              />
            )}
          </LiveCard>
          <LiveCard step={stepMap.http}>
            {http && <ServerInfoCard http={http} />}
          </LiveCard>
          <LiveCard step={stepMap.metadata}>
            {metadata && <PageMetadataCard metadata={metadata} />}
          </LiveCard>
          <LiveCard step={stepMap.techStack}>
            {techStack && <TechStackCard techStack={techStack} />}
          </LiveCard>
        </LiveGrid>
      </LiveSection>

      <LiveSection title="Visual Capture" detail="optional screenshot, may finish last">
        <LiveGrid>
          <LiveCard step={stepMap.screenshot} wide>
            {screenshot && <ScreenshotCard screenshot={screenshot} />}
          </LiveCard>
        </LiveGrid>
      </LiveSection>
    </div>
  );
}

function LiveOverviewPanel({
  steps,
  dns,
  ssl,
  headers,
  http,
}: {
  steps: ScanJobStep[];
  dns?: DnsResult;
  ssl?: SslResult;
  headers?: HeadersResult;
  http?: HttpOverviewResult;
}) {
  const ready = steps.filter((step) => step.status === "success").length;
  const running = steps.filter((step) => step.status === "running").length;
  const errors = steps.filter((step) => step.status === "error").length;
  const signals = buildLiveSignals({ dns, ssl, headers, http });

  return (
    <LiveSection title="Live Overview" detail="high-level signals update as modules finish">
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.6fr)]">
        <div className="card-panel p-5 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-tight">
                Scan Build
              </h3>
              <p className="font-mono text-[11px] text-[#d7e8ff]/60 mt-2">
                Report cards are replaced with live analyzer data as each module completes.
              </p>
            </div>
            <span className="font-mono text-[11px] text-white/70">[LIVE]</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-5">
            <Metric label="Ready" value={ready} tone="pass" />
            <Metric label="Running" value={running} tone="warn" />
            <Metric label="Errors" value={errors} tone={errors ? "fail" : "muted"} />
          </div>
        </div>

        <div className="card-panel p-5 min-w-0">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-tight">
              Key Signals
            </h3>
            <span className="font-mono text-[11px] text-white/70">[PARTIAL]</span>
          </div>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,8.5rem),1fr))]">
            {signals.map((signal) => (
              <div key={signal.label} className="border border-primary-fixed/15 bg-[#151918] p-3 text-center">
                <p className="font-mono text-[11px] text-[#d7e8ff] mb-2 truncate" title={signal.label}>
                  {signal.label}
                </p>
                <span className={`status-badge text-[10px] ${signalClass(signal.status)}`}>
                  {signalText(signal.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LiveSection>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "pass" | "warn" | "fail" | "muted";
}) {
  const cls = {
    pass: "text-primary-fixed border-primary-fixed/35 bg-primary-fixed/5",
    warn: "text-secondary border-secondary/35 bg-secondary/5",
    fail: "text-error border-error/35 bg-error/5",
    muted: "text-on-surface-variant/55 border-primary-fixed/10 bg-[#070B0F]/35",
  }[tone];

  return (
    <div className={`border p-3 text-center ${cls}`}>
      <div className="font-mono text-2xl font-bold">{value}</div>
      <div className="font-mono text-[10px] uppercase mt-1">{label}</div>
    </div>
  );
}

type LiveSignalStatus = "pass" | "warn" | "fail" | "pending";

function buildLiveSignals({
  dns,
  ssl,
  headers,
  http,
}: {
  dns?: DnsResult;
  ssl?: SslResult;
  headers?: HeadersResult;
  http?: HttpOverviewResult;
}): { label: string; status: LiveSignalStatus }[] {
  const header = (name: string) =>
    headers?.securityHeaders.find((item) => item.header.toLowerCase() === name.toLowerCase());
  const hsts = header("Strict-Transport-Security");
  const csp = header("Content-Security-Policy");
  const dmarcStatus: LiveSignalStatus = !dns
    ? "pending"
    : dns.error
      ? "fail"
      : !dns.dmarcDetected
        ? "warn"
        : dns.dmarcRecord?.includes("p=none")
          ? "warn"
          : "pass";

  return [
    { label: "HTTPS", status: !ssl ? "pending" : ssl.httpsAvailable ? "pass" : "fail" },
    { label: "HSTS", status: !headers ? "pending" : hsts?.status === "present" ? "pass" : hsts?.status === "warning" ? "warn" : "warn" },
    { label: "CSP", status: !headers ? "pending" : csp?.status === "present" ? "pass" : csp?.status === "warning" ? "warn" : "warn" },
    { label: "SPF", status: !dns ? "pending" : dns.spfDetected ? "pass" : "warn" },
    { label: "DMARC", status: dmarcStatus },
    { label: "DNSSEC", status: !dns ? "pending" : dns.dnssecSigned ? "pass" : "warn" },
    { label: "HTTP", status: !http ? "pending" : http.statusCode >= 200 && http.statusCode < 400 ? "pass" : "warn" },
  ];
}

function signalText(status: LiveSignalStatus) {
  if (status === "pass") return "[OK]";
  if (status === "warn") return "[WARN]";
  if (status === "fail") return "[FAIL]";
  return "[...]";
}

function signalClass(status: LiveSignalStatus) {
  if (status === "pass") return "status-pass";
  if (status === "warn") return "status-warn";
  if (status === "fail") return "status-fail";
  return "status-missing";
}

function LiveSection({
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

function LiveGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
      }}
    >
      {children}
    </div>
  );
}

function LiveCard({
  step,
  children,
  wide = false,
}: {
  step?: ScanJobStep;
  children: ReactNode;
  wide?: boolean;
}) {
  const isReady = step?.status === "success" && Boolean(step.data);
  if (isReady) {
    return <div className={`min-w-0 ${wide ? "lg:col-span-full" : ""}`}>{children}</div>;
  }

  return (
    <div className={`min-w-0 ${wide ? "lg:col-span-full" : ""}`}>
      <div className="card-panel min-h-56 relative overflow-hidden p-5 flex flex-col gap-4">
        {step?.status === "running" && (
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-primary-fixed/5 to-transparent" />
        )}
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-mono text-xl font-bold text-primary-fixed leading-tight">
            {step?.label ?? "Module"}
          </h3>
          <span className={`font-mono text-[10px] uppercase ${statusColor(step?.status)}`}>
            {statusText(step?.status)}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center border border-primary-fixed/10 bg-[#070B0F]/35">
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <AppIcon
              name={step?.status === "error" ? "report_problem" : "hourglass_top"}
              className={`text-3xl ${statusColor(step?.status)}`}
            />
            <p className="font-mono text-[11px] text-on-surface-variant/75 max-w-xs">
              {step?.error ?? (step?.status === "running" ? "Analyzer is running..." : "Waiting for analyzer data")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function dataOf<T>(step?: ScanJobStep): T | undefined {
  if (step?.status !== "success" || step.data === undefined || step.data === null) {
    return undefined;
  }
  return step.data as T;
}

function statusText(status?: ScanJobStep["status"]) {
  if (status === "success") return "Ready";
  if (status === "error") return "Error";
  if (status === "running") return "Running";
  return "Pending";
}

function statusColor(status?: ScanJobStep["status"]) {
  if (status === "success") return "text-primary-fixed";
  if (status === "error") return "text-error";
  if (status === "running") return "text-secondary animate-pulse";
  return "text-on-surface-variant/45";
}
