import type { DnsResult } from "@/types";

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
    <div className="flex justify-between gap-4 px-5 py-1.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="font-mono text-sm text-white font-bold shrink-0">
        {label}
      </span>
      <span className={`font-mono text-sm ${valueCls} text-right break-all`}>
        {value || "Unknown"}
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
      <p className="font-mono text-sm text-white font-bold mb-1">{title}</p>
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
  return "bad";
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

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Email Security
        </h3>
        <div className="flex items-center gap-2 pt-0.5">
          {dns.emailSecurityConfidence && (
            <span className={`font-mono text-[10px] border px-2 py-0.5 ${CONFIDENCE_STYLE[dns.emailSecurityConfidence]}`}>
              {dns.emailSecurityConfidence.toUpperCase()}
            </span>
          )}
          <span className={`status-badge ${dns.spfDetected ? "status-pass" : "status-fail"} text-[10px]`}>
            {dns.spfDetected ? "[SPF]" : "[-] SPF"}
          </span>
          <span className={`status-badge ${dns.dmarcDetected ? "status-pass" : "status-fail"} text-[10px]`}>
            {dns.dmarcDetected ? "[DMARC]" : "[-] DMARC"}
          </span>
        </div>
      </div>

      {dns.error ? (
        <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {dns.error}</p>
      ) : (
        <div>
          <Row label="MX" value={dns.mxDetected ? mxPreview || "YES" : "NO"} tone={dns.mxDetected ? "good" : "warn"} />
          <Row label="SPF Policy" value={describeSpfAll(dns.spfAll)} tone={spfTone(dns.spfAll)} />
          <Row label="SPF Lookups" value={dns.spfLookupCount} tone={dns.spfLookupCount > 10 ? "bad" : dns.spfLookupCount > 8 ? "warn" : "normal"} />
          <Row label="DMARC Policy" value={dns.dmarcPolicy} tone={dmarcTone(dns.dmarcPolicy)} />
          <Row label="Subdomain Policy" value={dns.dmarcSubdomainPolicy} tone={dmarcTone(dns.dmarcSubdomainPolicy || dns.dmarcPolicy)} />
          <Row label="DMARC Percent" value={dns.dmarcPct !== undefined ? `${dns.dmarcPct}%` : undefined} tone={dns.dmarcPct !== undefined && dns.dmarcPct < 100 ? "warn" : "normal"} />
          <Row label="Aggregate Reports" value={dns.dmarcRua} />
          <Row label="DKIM Alignment" value={dns.dmarcAlignmentDkim === "s" ? "strict" : dns.dmarcAlignmentDkim === "r" ? "relaxed" : undefined} />
          <Row label="SPF Alignment" value={dns.dmarcAlignmentSpf === "s" ? "strict" : dns.dmarcAlignmentSpf === "r" ? "relaxed" : undefined} />
          <EvidenceBlock title="MX Evidence" items={dns.mxEvidence} />
          <EvidenceBlock title="SPF Evidence" items={dns.spfEvidence} />
          <EvidenceBlock title="DMARC Evidence" items={dns.dmarcEvidence} />
        </div>
      )}
    </div>
  );
}
