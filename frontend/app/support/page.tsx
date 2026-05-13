import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

const ANALYZERS = [
  { icon: "dns",               key: "DNS",         label: "DNS Analysis",         desc: "Resolves A, AAAA, MX, NS, TXT records. Detects SPF and DMARC presence and evaluates policy strictness (p=none vs p=reject)." },
  { icon: "lock",              key: "SSL",         label: "SSL / TLS",            desc: "Checks HTTPS availability, certificate issuer, subject, valid dates, days remaining, SAN domains, TLS protocol version, and trust chain." },
  { icon: "http",              key: "HEADERS",     label: "Security Headers",     desc: "Evaluates HSTS, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. Flags exposed Server and X-Powered-By headers." },
  { icon: "person_search",     key: "WHOIS",       label: "WHOIS",                desc: "Looks up registrar, creation/expiry dates, nameservers, and DNSSEC status. Flags domains expiring within 30 days or already expired." },
  { icon: "stacks",            key: "TECHSTACK",   label: "Tech Stack",           desc: "85+ fingerprint rules across headers, HTML, and scripts. Detects frameworks, CDN providers, CMS platforms, analytics tools, hosting, and more." },
  { icon: "cookie",            key: "COOKIES",     label: "Cookie Audit",         desc: "Inspects each Set-Cookie header for Secure, HttpOnly, and SameSite flags. Flags cookies that are missing security attributes." },
  { icon: "security",          key: "SECTXT",      label: "Security.txt",         desc: "Checks /.well-known/security.txt and /security.txt per RFC 9116. Verifies Contact, Policy, Encryption, and Expires fields." },
  { icon: "screenshot_monitor",key: "SCREENSHOT",  label: "Live Screenshot",      desc: "Captures a Playwright screenshot at desktop (1280×720) and mobile (390×844) viewport. Requires ENABLE_SCREENSHOT=true in backend config." },
];

const FAQ = [
  {
    q: "Does scanning affect the target server?",
    a: "XyaVora-Scan is 100% passive — it performs DNS lookups, makes standard HTTP/HTTPS requests, and reads public records (WHOIS). No exploits, no fuzzing, no active probing beyond what a browser would do.",
  },
  {
    q: "Why does the screenshot show blank or fail?",
    a: "Screenshot capture requires ENABLE_SCREENSHOT=true in the backend .env and Playwright browsers installed (playwright install chromium). By default it is disabled to keep the backend lightweight.",
  },
  {
    q: "How is the risk score calculated?",
    a: "Each analyzer produces findings tagged fail or warning. The score starts at 100 and deducts points per finding (e.g. no HTTPS: -30, missing HSTS: -10, missing CSP: -10). The grade maps to A (≥90), B (≥80), C (≥70), D (≥60), F (<60).",
  },
  {
    q: "Why does VIEW in History sometimes re-scan?",
    a: "It doesn't — VIEW loads the stored historical report. RESCAN explicitly triggers a fresh scan.",
  },
  {
    q: "How long are results cached?",
    a: "The backend caches scan results in memory for 120 seconds. Scanning the same domain twice within that window returns the cached result instantly.",
  },
  {
    q: "What is the rate limit?",
    a: "10 scans per 60 seconds per IP address. Exceeding the limit returns HTTP 429.",
  },
];

export default function SupportPage() {
  return (
    <AppShell>
      <div className="p-4 md:p-8 w-full max-w-[1440px] mx-auto space-y-8">

        {/* Header */}
        <div className="pb-4 border-b border-primary-fixed/15">
          <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest block mb-1">
            &gt; SYS.SUPPORT_DOCS
          </span>
          <h1 className="font-mono text-xl font-bold text-primary-fixed">SUPPORT</h1>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: "GitHub Repository", icon: "code",    href: "https://github.com" },
            { label: "New Scan",          icon: "radar",   href: "/scan"              },
            { label: "Settings",          icon: "settings",href: "/settings"          },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="btn-ghost px-4 py-2 text-xs flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Analyzers */}
        <section>
          <h2 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase border-b border-primary-fixed/20 pb-2 mb-4">
            SYS.ANALYZER_REFERENCE
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ANALYZERS.map((a) => (
              <div key={a.key} className="card-panel p-4 flex gap-4">
                <span className="material-symbols-outlined text-primary-fixed text-[22px] shrink-0 mt-0.5">{a.icon}</span>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-primary-fixed">{a.label}</span>
                    <span className="font-mono text-[9px] text-primary-fixed/30 border border-primary-fixed/20 px-1">{a.key}</span>
                  </div>
                  <p className="font-mono text-[11px] text-primary-fixed/50 leading-relaxed">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase border-b border-primary-fixed/20 pb-2 mb-4">
            SYS.FAQ
          </h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <div key={item.q} className="card-panel p-4">
                <p className="font-mono text-sm text-primary-fixed font-bold mb-2">
                  &gt; {item.q}
                </p>
                <p className="font-mono text-[11px] text-primary-fixed/60 leading-relaxed pl-3 border-l-2 border-primary-fixed/20">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </AppShell>
  );
}
