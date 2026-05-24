import type { DnsResult } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

interface Props {
  dns: DnsResult;
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

function spfPolicy(dns: DnsResult): Signal {
  if (!dns.spfDetected) {
    return {
      label: "SPF",
      status: dns.mxDetected ? "warn" : "missing",
      value: "Not observed",
      note: "SPF defines allowed mail senders for the domain.",
    };
  }
  const status = dns.spfRecordCount > 1 || (dns.spfLookupCount ?? 0) > 10
    ? "fail"
    : dns.spfAll === "-" && (dns.spfLookupCount ?? 0) < 8
      ? "pass"
      : "warn";
  return {
    label: "SPF",
    status,
    value: `${dns.spfRecordCount} record, ${dns.spfLookupCount ?? 0} lookups`,
    note: `${dns.spfIncludes?.length ?? 0} includes${dns.spfRedirect ? `, redirect ${dns.spfRedirect}` : ""}`,
  };
}

function dmarcPolicy(dns: DnsResult): Signal {
  if (!dns.dmarcDetected) {
    return {
      label: "DMARC",
      status: dns.mxDetected ? "warn" : "missing",
      value: "Not observed",
      note: "DMARC publishes domain-level mail authentication policy.",
    };
  }
  const enforced = dns.dmarcPolicy === "quarantine" || dns.dmarcPolicy === "reject";
  return {
    label: "DMARC",
    status: dns.dmarcRecordCount > 1 ? "fail" : enforced ? "pass" : "warn",
    value: dns.dmarcPolicy ?? "Unknown policy",
    note: dns.dmarcReportingEnabled ? "Aggregate reporting configured." : "Aggregate reporting not configured.",
  };
}

function dkimPolicy(dns: DnsResult): Signal {
  const found = dns.dkimSelectorsFound?.length ?? 0;
  return {
    label: "DKIM",
    status: found > 0 ? "pass" : dns.mxDetected ? "warn" : "missing",
    value: found > 0 ? dns.dkimSelectorsFound?.join(", ") ?? "Observed" : "Common selectors not observed",
    note: "Checks a short list of common selector._domainkey names; absence is not definitive.",
  };
}

function mxPolicy(dns: DnsResult): Signal {
  return {
    label: "MX Routing",
    status: dns.mxDetected ? "pass" : "missing",
    value: dns.mxProviders?.length ? dns.mxProviders.join(", ") : dns.mxDetected ? `${dns.mxRecords?.length ?? 0} MX records` : "No MX",
    note: "Mail exchanger records and provider fingerprint from DNS MX hosts.",
  };
}

export function MailConfigurationCard({ dns }: Props) {
  const signals = [mxPolicy(dns), spfPolicy(dns), dkimPolicy(dns), dmarcPolicy(dns)];
  const failures = signals.filter((signal) => signal.status === "fail").length;
  const warnings = signals.filter((signal) => signal.status === "warn" || signal.status === "missing").length;
  const overall = dns.error ? "fail" : failures ? "fail" : warnings ? "warn" : "pass";
  const detailItems = [
    { label: "MX Providers", value: dns.mxProviders?.join("\n") },
    { label: "MX Records", value: dns.mxRecords?.join("\n") },
    { label: "SPF Record", value: dns.spfRecord },
    { label: "SPF Includes", value: dns.spfIncludes?.join("\n") },
    { label: "SPF Redirect", value: dns.spfRedirect },
    { label: "SPF Mechanisms", value: dns.spfMechanisms?.join("\n") },
    { label: "DMARC Record", value: dns.dmarcRecord },
    { label: "DMARC Enforcement", value: dns.dmarcEnforcement },
    { label: "DMARC Reporting", value: dns.dmarcReportingEnabled },
    { label: "DMARC Forensic Reporting", value: dns.dmarcForensicReportingEnabled },
    { label: "DKIM Selectors Checked", value: dns.dkimSelectorsChecked?.join("\n") },
    { label: "DKIM Selectors Found", value: dns.dkimSelectorsFound?.join("\n") },
    { label: "DKIM Records", value: dns.dkimRecords?.join("\n") },
    { label: "DKIM Evidence", value: dns.dkimEvidence?.join("\n") },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0">
        <div>
          <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
            Mail Configuration
          </h3>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#d7e8ff]/60">
            MX routing, SPF complexity, common DKIM selectors, and DMARC enforcement.
          </p>
        </div>
        <span className={`status-badge ${STATUS[overall].badge} text-[10px] shrink-0`}>
          {overall === "pass" ? "Clean" : overall === "warn" ? "Review" : "Issue"}
        </span>
      </div>

      {dns.error ? (
        <p className="px-5 py-4 font-mono text-sm text-error/70">[-] {dns.error}</p>
      ) : (
        <>
          <div className="px-5 pb-3 flex flex-wrap items-center gap-2">
            <SourceQualityBadge source="dns" />
            {dns.emailSecurityConfidence && (
              <span className="font-mono text-[10px] text-[#d7e8ff]/55">
                {dns.emailSecurityConfidence.toUpperCase()} CONFIDENCE
              </span>
            )}
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

      {!dns.error && <DetailPanel items={detailItems} label="Mail Configuration Details" />}
    </div>
  );
}
