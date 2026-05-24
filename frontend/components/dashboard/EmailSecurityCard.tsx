import type { DnsResult } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

type Props = {
  dns: DnsResult;
};

function Row({ label, value, tone = "normal" }: { label: string; value?: string | number | null; tone?: "normal" | "warn" | "bad" | "good" }) {
  const valueCls = {
    normal: "text-[#d7e8ff]",
    warn: "text-status-warn",
    bad: "text-error",
    good: "text-primary-fixed",
  }[tone];

  return (
    <div className="grid grid-cols-[142px_minmax(0,1fr)] gap-4 px-5 py-1.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="font-mono text-sm text-white font-bold shrink-0">
        {label}
      </span>
      <span className={`min-w-0 font-mono text-sm ${valueCls} text-right break-words`}>
        {value === undefined || value === null || value === "" ? "Unknown" : value}
      </span>
    </div>
  );
}

const CONFIDENCE_STYLE: Record<"high" | "medium" | "low", string> = {
  high: "border-primary-fixed/45 text-primary-fixed bg-primary-fixed/10",
  medium: "border-status-warn/50 text-status-warn bg-status-warn/10",
  low: "border-white/20 text-white/50 bg-white/[0.03]",
};

function EvidenceBlock({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="px-5 py-2 border-b border-primary-fixed/10 bg-[#151918]">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-mono text-sm text-white font-bold">{title}</p>
        <SourceQualityBadge source="dns" />
      </div>
      <div className="space-y-1">
        {items.slice(0, 3).map((item) => (
          <p key={item} className="font-mono text-[10px] text-[#d7e8ff]/65 break-all">
            &gt; {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function spfTone(spfAll?: string) {
  if (spfAll === "-") return "good";
  if (spfAll === "~") return "warn";
  if (spfAll === "+" || spfAll === "?") return "bad";
  return "normal";
}

function dmarcTone(policy?: string) {
  if (policy === "reject" || policy === "quarantine") return "good";
  if (policy === "none") return "warn";
  return "normal";
}

function describeSpfAll(spfAll?: string) {
  if (spfAll === "-") return "-all hard fail";
  if (spfAll === "~") return "~all soft fail";
  if (spfAll === "?") return "?all neutral";
  if (spfAll === "+") return "+all pass";
  return undefined;
}

export function EmailSecurityCard({ dns }: Props) {
  const mxPreview = dns.mxRecords?.slice(0, 2).join(", ");
  const detailItems = [
    { label: "MX Detected", value: dns.mxDetected },
    { label: "MX Records", value: dns.mxRecords?.join("\n") },
    { label: "MX Providers", value: dns.mxProviders?.join("\n") },
    { label: "MX Evidence", value: dns.mxEvidence?.join("\n") },
    { label: "SPF Detected", value: dns.spfDetected },
    { label: "SPF Record Count", value: dns.spfRecordCount },
    { label: "SPF Record", value: dns.spfRecord },
    { label: "SPF All Policy", value: describeSpfAll(dns.spfAll) },
    { label: "SPF Lookups", value: dns.spfLookupCount },
    { label: "SPF Includes", value: dns.spfIncludes?.join("\n") },
    { label: "SPF Redirect", value: dns.spfRedirect },
    { label: "SPF Mechanisms", value: dns.spfMechanisms?.join("\n") },
    { label: "SPF Evidence", value: dns.spfEvidence?.join("\n") },
    { label: "DMARC Detected", value: dns.dmarcDetected },
    { label: "DMARC Record Count", value: dns.dmarcRecordCount },
    { label: "DMARC Record", value: dns.dmarcRecord },
    { label: "DMARC Policy", value: dns.dmarcPolicy },
    { label: "Subdomain Policy", value: dns.dmarcSubdomainPolicy },
    { label: "DMARC Percent", value: dns.dmarcPct !== undefined ? `${dns.dmarcPct}%` : undefined },
    { label: "Aggregate Reports", value: dns.dmarcRua },
    { label: "Forensic Reports", value: dns.dmarcRuf },
    { label: "DMARC Reporting Enabled", value: dns.dmarcReportingEnabled },
    { label: "DMARC Forensic Reporting", value: dns.dmarcForensicReportingEnabled },
    { label: "DMARC Enforcement", value: dns.dmarcEnforcement },
    { label: "DKIM Alignment", value: dns.dmarcAlignmentDkim },
    { label: "SPF Alignment", value: dns.dmarcAlignmentSpf },
    { label: "DKIM Selectors Checked", value: dns.dkimSelectorsChecked?.join("\n") },
    { label: "DKIM Selectors Found", value: dns.dkimSelectorsFound?.join("\n") },
    { label: "DKIM Records", value: dns.dkimRecords?.join("\n") },
    { label: "DKIM Evidence", value: dns.dkimEvidence?.join("\n") },
    { label: "DMARC Evidence", value: dns.dmarcEvidence?.join("\n") },
    { label: "DNS Query Evidence", value: dns.dnsQueryEvidence?.join("\n") },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex flex-col gap-3 shrink-0 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Email Security
        </h3>
        <div className="flex flex-wrap items-center gap-2 pt-0.5 sm:justify-end">
          {dns.emailSecurityConfidence && (
            <span className={`font-mono text-[10px] border px-2 py-0.5 ${CONFIDENCE_STYLE[dns.emailSecurityConfidence]}`}>
              {dns.emailSecurityConfidence.toUpperCase()}
            </span>
          )}
          {(dns.mxEvidence?.length || dns.spfEvidence?.length || dns.dmarcEvidence?.length) ? (
            <SourceQualityBadge source="dns" />
          ) : (
            <SourceQualityBadge source="missing" />
          )}
          <span className={`status-badge ${dns.spfDetected ? "status-pass" : "status-warn"} text-[10px]`}>
            {dns.spfDetected ? "[SPF]" : "[-] SPF"}
          </span>
          <span className={`status-badge ${dns.dmarcDetected ? "status-pass" : "status-warn"} text-[10px]`}>
            {dns.dmarcDetected ? "[DMARC]" : "[-] DMARC"}
          </span>
        </div>
      </div>

      {dns.error ? (
        <div className="mx-5 mb-5 border border-error/25 bg-error/[0.04] p-3">
          <p className="font-mono text-sm text-error/80">[-] {dns.error}</p>
          <p className="mt-1 font-mono text-[11px] text-[#d7e8ff]/55">
            DNS email-security signals could not be collected for this target.
          </p>
        </div>
      ) : (
        <div>
          {!dns.mxDetected && !dns.spfDetected && !dns.dmarcDetected && (
            <div className="mx-5 mb-2 border border-primary-fixed/15 bg-[#151918] p-3">
              <p className="font-mono text-sm text-[#d7e8ff]/75">
                No MX, SPF, or DMARC signal was observed.
              </p>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-primary-fixed/60">
                This may be normal for domains that do not send email.
              </p>
            </div>
          )}
          <Row label="MX" value={dns.mxDetected ? mxPreview || "YES" : "NO"} tone={dns.mxDetected ? "good" : "warn"} />
          <Row label="MX Provider" value={dns.mxProviders?.join(", ")} />
          <Row label="SPF Records" value={dns.spfRecordCount} tone={dns.spfRecordCount > 1 ? "bad" : dns.spfRecordCount === 1 ? "good" : "warn"} />
          <Row label="SPF Policy" value={describeSpfAll(dns.spfAll)} tone={spfTone(dns.spfAll)} />
          <Row label="SPF Lookups" value={dns.spfLookupCount} tone={dns.spfLookupCount > 10 ? "bad" : dns.spfLookupCount > 8 ? "warn" : "normal"} />
          <Row label="SPF Includes" value={dns.spfIncludes?.length} tone={(dns.spfIncludes?.length ?? 0) > 4 ? "warn" : "normal"} />
          <Row label="DMARC Records" value={dns.dmarcRecordCount} tone={dns.dmarcRecordCount > 1 ? "bad" : dns.dmarcRecordCount === 1 ? "good" : "warn"} />
          <Row label="DMARC Policy" value={dns.dmarcPolicy} tone={dmarcTone(dns.dmarcPolicy)} />
          <Row label="DMARC Mode" value={dns.dmarcEnforcement} tone={dns.dmarcEnforcement === "enforced" ? "good" : dns.dmarcEnforcement === "monitoring" ? "warn" : "normal"} />
          <Row label="Subdomain Policy" value={dns.dmarcSubdomainPolicy} tone={dmarcTone(dns.dmarcSubdomainPolicy || dns.dmarcPolicy)} />
          <Row label="DMARC Percent" value={dns.dmarcPct !== undefined ? `${dns.dmarcPct}%` : undefined} tone={dns.dmarcPct !== undefined && dns.dmarcPct < 100 ? "warn" : "normal"} />
          <Row label="Aggregate Reports" value={dns.dmarcRua} />
          <Row label="Common DKIM" value={(dns.dkimSelectorsFound?.length ?? 0) > 0 ? dns.dkimSelectorsFound?.join(", ") : "Not observed"} tone={(dns.dkimSelectorsFound?.length ?? 0) > 0 ? "good" : "warn"} />
          <Row label="DKIM Alignment" value={dns.dmarcAlignmentDkim === "s" ? "strict" : dns.dmarcAlignmentDkim === "r" ? "relaxed" : undefined} />
          <Row label="SPF Alignment" value={dns.dmarcAlignmentSpf === "s" ? "strict" : dns.dmarcAlignmentSpf === "r" ? "relaxed" : undefined} />
          <EvidenceBlock title="MX Evidence" items={dns.mxEvidence} />
          <EvidenceBlock title="SPF Evidence" items={dns.spfEvidence} />
          <EvidenceBlock title="DMARC Evidence" items={dns.dmarcEvidence} />
        </div>
      )}
      {!dns.error && <DetailPanel items={detailItems} />}
    </div>
  );
}
