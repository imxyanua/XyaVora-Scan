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
    <div className="flex justify-between gap-4 px-4 py-2.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="font-mono text-[10px] text-primary-fixed/65 uppercase tracking-widest shrink-0">
        {label}
      </span>
      <span className={`font-mono text-[11px] ${valueCls} text-right break-all`}>
        {value || "-"}
      </span>
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
    <div className="bg-[#0D0F10] border border-primary-fixed/15 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="p-3 border-b border-primary-fixed/20 bg-[#151918] flex justify-between items-center shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-white uppercase">
          Email Security
        </h3>
        <div className="flex items-center gap-2">
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
        </div>
      )}
    </div>
  );
}
