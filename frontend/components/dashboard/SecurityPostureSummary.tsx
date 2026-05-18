import type { CookieResult, HeadersResult, SecurityTxtResult, SslResult } from "@/types";

type Props = {
  ssl: SslResult;
  headers: HeadersResult;
  cookies: CookieResult[];
  securityTxt: SecurityTxtResult;
};

type PostureStatus = "good" | "warn" | "bad";

const STATUS_STYLE: Record<PostureStatus, { cls: string; label: string }> = {
  good: { cls: "border-primary-fixed/45 text-primary-fixed bg-primary-fixed/10", label: "Good" },
  warn: { cls: "border-status-warn/55 text-status-warn bg-status-warn/10", label: "Needs review" },
  bad: { cls: "border-error/60 text-error bg-error/10", label: "Risk" },
};

function statusForHeaders(headers: HeadersResult): PostureStatus {
  if (headers.error) return "bad";
  if (headers.securityHeaders.some((item) => item.status === "missing" || item.status === "warning")) return "warn";
  return "good";
}

function statusForCookies(cookies: CookieResult[]): PostureStatus {
  if (cookies.length === 0) return "warn";
  return cookies.some((cookie) => cookie.warnings.length > 0) ? "warn" : "good";
}

function statusForTls(ssl: SslResult): PostureStatus {
  if (ssl.error || !ssl.httpsAvailable || !ssl.trusted) return "bad";
  if (ssl.warning || ssl.daysRemaining < 30) return "warn";
  return "good";
}

function Metric({ label, value, status }: { label: string; value: string; status: PostureStatus }) {
  const style = STATUS_STYLE[status];

  return (
    <div className="border border-primary-fixed/15 bg-[#151918] p-3 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-sm font-bold text-white">
          {label}
        </span>
        <span className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] leading-none ${style.cls}`}>
          {style.label}
        </span>
      </div>
      <p className="mt-2 font-mono text-xs leading-relaxed text-[#d7e8ff]/70">
        {value}
      </p>
    </div>
  );
}

export function SecurityPostureSummary({ ssl, headers, cookies, securityTxt }: Props) {
  const missingHeaders = headers.securityHeaders.filter((item) => item.status === "missing").length;
  const weakHeaders = headers.securityHeaders.filter((item) => item.status === "warning").length;
  const cookieWarnings = cookies.reduce((total, cookie) => total + cookie.warnings.length, 0);

  const tlsStatus = statusForTls(ssl);
  const headersStatus = statusForHeaders(headers);
  const cookiesStatus = statusForCookies(cookies);
  const disclosureStatus = securityTxt.present ? "good" : "warn";

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-4">
        <div>
          <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
            Security Posture Summary
          </h3>
          <p className="font-mono text-[13px] text-[#d7e8ff]/70 mt-2 max-w-3xl leading-relaxed">
            Quick read of transport, browser protections, session cookies, and security contact disclosure.
          </p>
        </div>
        <span className="font-mono text-[11px] text-white/70">[POSTURE]</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        <Metric
          label="Transport"
          status={tlsStatus}
          value={ssl.httpsAvailable ? `${ssl.protocol ?? "TLS"} certificate, ${ssl.daysRemaining} days left` : "HTTPS unavailable or certificate check failed"}
        />
        <Metric
          label="Headers"
          status={headersStatus}
          value={headers.error ? headers.error : `${missingHeaders} missing best-practice headers, ${weakHeaders} weak or permissive`}
        />
        <Metric
          label="Cookies"
          status={cookiesStatus}
          value={cookies.length > 0 ? `${cookies.length} cookies, ${cookieWarnings} warnings` : "No cookies observed in scanned response"}
        />
        <Metric
          label="Disclosure"
          status={disclosureStatus}
          value={securityTxt.present ? "security.txt is published" : "security.txt was not found"}
        />
      </div>
    </div>
  );
}
