import type { HeadersResult, DnsResult } from "@/types";

interface Props {
  headers: HeadersResult;
  dns:     DnsResult;
  ssl:     { httpsAvailable: boolean };
}

type SignalStatus = "pass" | "warn" | "fail" | "missing";

interface Signal {
  label:  string;
  status: SignalStatus;
  value?: string;
}

const BADGE: Record<SignalStatus, { cls: string; text: string }> = {
  pass:    { cls: "status-pass",    text: "[OK] PASS"  },
  warn:    { cls: "status-warn",    text: "[!!] WARN"  },
  fail:    { cls: "status-fail",    text: "[FAIL]"     },
  missing: { cls: "status-missing", text: "[-] NULL"   },
};

export function KeySignalsOverview({ headers, dns, ssl }: Props) {
  const headersOk = !headers.error;
  const dnsOk     = !dns.error;

  const findHeader = (name: string) =>
    headersOk
      ? headers.securityHeaders.find((h) => h.header.toLowerCase() === name.toLowerCase())
      : undefined;

  const hsts   = findHeader("Strict-Transport-Security");
  const csp    = findHeader("Content-Security-Policy");
  const xframe = findHeader("X-Frame-Options");

  const dmarcStatus: SignalStatus = !dnsOk
    ? "missing"
    : !dns.dmarcDetected
    ? "missing"
    : dns.dmarcRecord?.includes("p=none")
    ? "warn"
    : "pass";

  const signals: Signal[] = [
    {
      label:  "SEC.HTTPS",
      status: ssl.httpsAvailable ? "pass" : "fail",
    },
    {
      label:  "SEC.HSTS",
      status: !headersOk ? "missing" : hsts?.status === "present" ? "pass" : hsts?.status === "warning" ? "warn" : "missing",
    },
    {
      label:  "SEC.CSP",
      status: !headersOk ? "missing" : csp?.status === "present" ? "pass" : csp?.status === "warning" ? "warn" : "missing",
    },
    {
      label:  "MAIL.DMARC",
      status: dmarcStatus,
    },
    {
      label:  "SEC.X-FRAME",
      status: !headersOk ? "missing" : xframe?.status === "present" ? "pass" : "missing",
    },
    {
      label:  "DNS.SPF",
      status: !dnsOk ? "missing" : dns.spfDetected ? "pass" : "missing",
    },
    {
      label:  "DNSSEC",
      status: !dnsOk ? "missing" : dns.dnssecSigned ? "pass" : "missing",
    },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 shrink-0">
        <h2 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Key Signals
        </h2>
        <span className="font-mono text-[11px] text-white/70">[MATRIX]</span>
      </div>

      {/* Signal grid */}
      <div className="grid flex-1 gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr))]">
        {signals.map((sig) => {
          const badge = BADGE[sig.status];
          return (
            <div
              key={sig.label}
              className="border border-primary-fixed/15 p-3 bg-[#151918] flex flex-col justify-center items-center text-center hover:border-primary-fixed/45 hover:bg-primary-fixed/[0.04] transition-colors"
            >
              <span className="font-mono text-[11px] text-[#d7e8ff] mb-2 leading-tight">
                {sig.label}
              </span>
              <span className={`status-badge ${badge.cls} text-[10px]`}>
                {badge.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
