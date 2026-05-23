import type { HeadersResult, SecurityHeaderItem } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

interface Props {
  headers: HeadersResult;
}

type HstsSummary = {
  header?: SecurityHeaderItem;
  maxAge?: number;
  maxAgeDays?: number;
  includeSubDomains: boolean;
  preload: boolean;
};

const MIN_HSTS_SECONDS = 15_552_000;
const PRELOAD_SECONDS = 31_536_000;

function findHsts(headers: HeadersResult): SecurityHeaderItem | undefined {
  return headers.securityHeaders.find(
    (item) => item.header.toLowerCase() === "strict-transport-security",
  );
}

function parseHsts(headers: HeadersResult): HstsSummary {
  const header = findHsts(headers);
  const value = header?.value ?? "";
  const directives = value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const maxAgeDirective = directives.find((part) => part.toLowerCase().startsWith("max-age="));
  const parsedMaxAge = maxAgeDirective ? Number(maxAgeDirective.split("=")[1]) : undefined;
  const maxAge = typeof parsedMaxAge === "number" && Number.isFinite(parsedMaxAge)
    ? parsedMaxAge
    : undefined;

  return {
    header,
    maxAge,
    maxAgeDays: maxAge !== undefined ? Math.floor(maxAge / 86400) : undefined,
    includeSubDomains: directives.some((part) => part.toLowerCase() === "includesubdomains"),
    preload: directives.some((part) => part.toLowerCase() === "preload"),
  };
}

function statusFor(summary: HstsSummary, headers: HeadersResult) {
  if (headers.error) {
    return { label: "Unavailable", badge: "status-missing", tone: "text-on-surface-variant/60" };
  }
  if (!summary.header || summary.header.status === "missing") {
    return { label: "Not Observed", badge: "status-warn", tone: "text-status-warn" };
  }
  if (summary.header.status === "warning" || !summary.maxAge || summary.maxAge < MIN_HSTS_SECONDS) {
    return { label: "Needs Review", badge: "status-warn", tone: "text-status-warn" };
  }
  return { label: "Enforced", badge: "status-pass", tone: "text-primary-fixed" };
}

function boolText(value: boolean) {
  return value ? "Yes" : "No";
}

export function HstsCard({ headers }: Props) {
  const summary = parseHsts(headers);
  const status = statusFor(summary, headers);
  const preloadReady = Boolean(
    summary.maxAge &&
    summary.maxAge >= PRELOAD_SECONDS &&
    summary.includeSubDomains &&
    summary.preload,
  );
  const detailItems = [
    { label: "Status", value: summary.header?.status },
    { label: "Header Value", value: summary.header?.value },
    { label: "Max Age Seconds", value: summary.maxAge },
    { label: "Max Age Days", value: summary.maxAgeDays },
    { label: "Include Subdomains", value: summary.includeSubDomains },
    { label: "Preload Directive", value: summary.preload },
    { label: "Preload Ready", value: preloadReady },
    { label: "Final URL", value: headers.finalUrl },
    { label: "Evidence", value: summary.header?.evidence?.join("\n") },
    { label: "Response Evidence", value: headers.responseEvidence?.join("\n") },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0">
        <div>
          <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
            HSTS
          </h3>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#d7e8ff]/60">
            Browser HTTPS pinning observed from the final HTTP response.
          </p>
        </div>
        <span className={`status-badge ${status.badge} text-[10px] shrink-0`}>
          {status.label}
        </span>
      </div>

      {headers.error ? (
        <p className="px-5 py-4 font-mono text-sm text-error/70">[-] {headers.error}</p>
      ) : (
        <div className="font-mono text-sm flex-1">
          <div className="grid grid-cols-[145px_minmax(0,1fr)] gap-4 px-5 py-2 border-y border-primary-fixed/10 bg-[#151918]">
            <span className="font-bold text-white">Header</span>
            <span className={`text-right font-bold ${status.tone}`}>
              {summary.header?.value ? "Present" : "Missing"}
            </span>
          </div>
          <div className="grid grid-cols-[145px_minmax(0,1fr)] gap-4 px-5 py-2 border-b border-primary-fixed/10">
            <span className="font-bold text-white">Max Age</span>
            <span className="text-right text-white">
              {summary.maxAgeDays !== undefined ? `${summary.maxAgeDays} days` : "Unknown"}
            </span>
          </div>
          <div className="grid grid-cols-[145px_minmax(0,1fr)] gap-4 px-5 py-2 border-b border-primary-fixed/10">
            <span className="font-bold text-white">Subdomains</span>
            <span className={summary.includeSubDomains ? "text-right text-primary-fixed" : "text-right text-status-warn"}>
              {boolText(summary.includeSubDomains)}
            </span>
          </div>
          <div className="grid grid-cols-[145px_minmax(0,1fr)] gap-4 px-5 py-2 border-b border-primary-fixed/10">
            <span className="font-bold text-white">Preload</span>
            <span className={preloadReady ? "text-right text-primary-fixed" : "text-right text-[#d7e8ff]/70"}>
              {preloadReady ? "Ready" : boolText(summary.preload)}
            </span>
          </div>
          <div className="px-5 py-3">
            <SourceQualityBadge source={summary.header?.value ? "header" : "missing"} />
          </div>
        </div>
      )}

      {!headers.error && <DetailPanel items={detailItems} label="HSTS Details" />}
    </div>
  );
}
