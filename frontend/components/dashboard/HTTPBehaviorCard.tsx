import type { HttpOverviewResult } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

interface Props {
  http: HttpOverviewResult;
}

type SignalStatus = "pass" | "warn" | "fail" | "missing";

type Signal = {
  label: string;
  status: SignalStatus;
  value: string;
  note: string;
};

const STATUS: Record<SignalStatus, { badge: string; text: string }> = {
  pass: { badge: "status-pass", text: "[OK]" },
  warn: { badge: "status-warn", text: "[REVIEW]" },
  fail: { badge: "status-fail", text: "[FAIL]" },
  missing: { badge: "status-missing", text: "[-]" },
};

function statusSignal(http: HttpOverviewResult): Signal {
  const status = http.statusCode ?? 0;
  return {
    label: "Final Status",
    status: status >= 500 ? "fail" : status >= 400 ? "warn" : status >= 200 ? "pass" : "missing",
    value: status ? String(status) : "Unknown",
    note: "Final response after redirects.",
  };
}

function redirectSignal(http: HttpOverviewResult): Signal {
  if (http.downgradedFromHttps) {
    return {
      label: "Redirect Safety",
      status: "fail",
      value: "HTTPS downgrade",
      note: "Redirect chain moved from HTTPS to HTTP.",
    };
  }
  if ((http.redirectCount ?? 0) >= 4) {
    return {
      label: "Redirect Safety",
      status: "warn",
      value: `${http.redirectCount} hops`,
      note: "Long redirect chains add latency and can obscure canonical behavior.",
    };
  }
  if (http.hostChanged && http.canonicalRedirectType === "cross-host") {
    return {
      label: "Redirect Safety",
      status: "warn",
      value: "Cross-host",
      note: "Final host differs from the input host.",
    };
  }
  return {
    label: "Redirect Safety",
    status: "pass",
    value: http.redirectSummary ?? `${http.redirectCount ?? 0} hops`,
    note: "No risky redirect behavior observed in this scan.",
  };
}

function contentSignal(http: HttpOverviewResult): Signal {
  const family = http.contentFamily ?? "unknown";
  return {
    label: "Content Type",
    status: family === "html" ? "pass" : family === "unknown" ? "missing" : "warn",
    value: http.contentType ?? family,
    note: family === "html"
      ? "Final response looks like an HTML page."
      : "The final response may be an API, asset, block page, or non-HTML endpoint.",
  };
}

function cacheSignal(http: HttpOverviewResult): Signal {
  const policy = http.cachePolicy ?? "not-specified";
  return {
    label: "Cache Policy",
    status: policy === "not-specified" ? "missing" : "pass",
    value: policy,
    note: "Derived from Cache-Control, validators, Expires, ETag, and Last-Modified.",
  };
}

export function HTTPBehaviorCard({ http }: Props) {
  const signals = [statusSignal(http), redirectSignal(http), contentSignal(http), cacheSignal(http)];
  const failures = signals.filter((signal) => signal.status === "fail").length;
  const warnings = signals.filter((signal) => signal.status === "warn" || signal.status === "missing").length;
  const overall = http.error ? "fail" : failures ? "fail" : warnings ? "warn" : "pass";
  const detailItems = [
    { label: "Status Code", value: http.statusCode },
    { label: "Final URL", value: http.finalUrl },
    { label: "Initial Protocol", value: http.initialProtocol },
    { label: "Final Protocol", value: http.finalProtocol },
    { label: "Initial Host", value: http.initialHost },
    { label: "Final Host", value: http.finalHost },
    { label: "Redirect Count", value: http.redirectCount },
    { label: "Redirect Summary", value: http.redirectSummary },
    { label: "Canonical Redirect Type", value: http.canonicalRedirectType },
    { label: "Cross Host Redirect", value: http.crossHostRedirect },
    { label: "Upgraded To HTTPS", value: http.upgradedToHttps },
    { label: "Downgraded From HTTPS", value: http.downgradedFromHttps },
    { label: "Content Type", value: http.contentType },
    { label: "Content Family", value: http.contentFamily },
    { label: "Cache Policy", value: http.cachePolicy },
    { label: "Response Truncated", value: http.responseTruncated },
    { label: "Response Evidence", value: http.responseEvidence?.join("\n") },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0">
        <div>
          <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
            HTTP Behavior
          </h3>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#d7e8ff]/60">
            Final response quality, redirect safety, cache posture, and content family.
          </p>
        </div>
        <span className={`status-badge ${STATUS[overall].badge} text-[10px] shrink-0`}>
          {overall === "pass" ? "Clean" : overall === "warn" ? "Review" : "Issue"}
        </span>
      </div>

      {http.error ? (
        <p className="px-5 py-4 font-mono text-sm text-error/70">[-] {http.error}</p>
      ) : (
        <>
          <div className="px-5 pb-3 flex flex-wrap items-center gap-2">
            <SourceQualityBadge source="header" />
            <span className="font-mono text-[10px] text-[#d7e8ff]/55">
              Observed final response after redirects.
            </span>
          </div>
          <div className="font-mono text-sm flex-1">
            {signals.map((signal) => {
              const status = STATUS[signal.status];
              return (
                <div
                  key={signal.label}
                  className="px-5 py-3 border-t border-primary-fixed/10 hover:bg-primary-fixed/[0.04] transition-colors"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-white">{signal.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#d7e8ff]/60">
                        {signal.note}
                      </p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <span className={`status-badge ${status.badge} text-[10px]`}>
                        {status.text}
                      </span>
                      <p className="mt-1 max-w-[17rem] break-words text-[11px] text-white">
                        {signal.value}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!http.error && <DetailPanel items={detailItems} label="HTTP Behavior Details" />}
    </div>
  );
}
