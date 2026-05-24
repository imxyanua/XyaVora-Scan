import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AppIcon } from "@/components/ui/AppIcon";

const MODULES = [
  { icon: "public", key: "HTTP", label: "HTTP Overview", desc: "Final status, redirects, content type, compression, cache headers, CDN hints, and final host behavior." },
  { icon: "dns", key: "DNS", label: "DNS And Mail", desc: "A, AAAA, MX, NS, TXT, SPF, and DMARC checks with email security evidence." },
  { icon: "lock", key: "TLS", label: "TLS Certificate", desc: "HTTPS availability, issuer, validity window, SAN domains, protocol, cipher, and trust evidence." },
  { icon: "http", key: "HEADERS", label: "Security Headers", desc: "HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy posture." },
  { icon: "person_search", key: "WHOIS", label: "WHOIS", desc: "Registrar, registration dates, expiry, nameservers, and DNSSEC data where public records are available." },
  { icon: "stacks", key: "STACK", label: "Tech Stack", desc: "Header, HTML, script, and asset fingerprints for frameworks, CDN, CMS, analytics, hosting, and related tooling." },
  { icon: "travel_explore", key: "CRAWL", label: "Crawl Hints", desc: "robots.txt, sitemap files, allowed/disallowed paths, crawl-delay, and discovery evidence." },
  { icon: "screenshot_monitor", key: "SHOT", label: "Screenshot", desc: "Optional desktop and mobile capture. It can finish after the core report because screenshots are slower and site-dependent." },
];

const FLOW = [
  {
    title: "Enter a public domain",
    body: "No account, token, or project setup is required. The scanner normalizes the target and blocks private or local network addresses.",
  },
  {
    title: "Watch live module progress",
    body: "The report page opens immediately. Cards turn from pending to live results as each analyzer completes.",
  },
  {
    title: "Review and export",
    body: "The completed report includes findings, evidence, score details, raw data, and external research links for follow-up validation.",
  },
];

const FAQ = [
  {
    q: "Do I need an account?",
    a: "No. XyaVora-Scan is designed as a public quick scanner. Scan a domain, inspect the report, export if needed, and leave.",
  },
  {
    q: "Where are guest reports stored?",
    a: "Recent guest reports are stored in your browser localStorage as a convenience. They are not a real user account and can disappear if browser storage is cleared.",
  },
  {
    q: "Why do results appear gradually?",
    a: "Analyzers run independently. Fast modules like HTTP or DNS can render first, while slower modules such as WHOIS or screenshots continue in the background.",
  },
  {
    q: "Why can a result be partial?",
    a: "Public websites vary. Some block headless browsers, hide WHOIS details, omit records, redirect heavily, or time out. The report marks evidence quality so uncertain data is not presented as verified.",
  },
  {
    q: "Does scanning attack the target?",
    a: "No. The scanner is passive: DNS lookups, standard HTTP/HTTPS requests, public WHOIS data, robots/sitemap fetches, and optional browser screenshot capture.",
  },
  {
    q: "Why is screenshot delayed or missing?",
    a: "Screenshot capture depends on Playwright, site load behavior, bot defenses, and timeout settings. It is intentionally non-blocking so the core report remains usable.",
  },
];

export default function SupportPage() {
  return (
    <AppShell>
      <div className="p-4 md:p-8 w-full max-w-[1440px] mx-auto space-y-8">
        <div className="pb-4 border-b border-primary-fixed/15">
          <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest block mb-1">
            &gt; PUBLIC_SCANNER_HELP
          </span>
          <h1 className="font-mono text-xl font-bold text-primary-fixed">HELP</h1>
          <p className="font-mono text-[11px] text-primary-fixed/45 mt-2 max-w-3xl">
            XyaVora-Scan is a no-account public scanner for quick website security posture checks.
            Results are evidence-based, progressively rendered, and stored locally only for recent guest scans.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.5fr)]">
          <div className="card-panel p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <AppIcon name="radar" className="text-primary-fixed text-3xl shrink-0" />
              <div>
                <h2 className="font-mono text-2xl font-bold text-primary-fixed leading-tight">
                  Scan-first workflow
                </h2>
                <p className="font-mono text-[11px] text-[#d7e8ff]/65 mt-2 leading-relaxed">
                  Enter a domain, watch live modules complete, then use the report. Accounts are not part of this phase.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/scan" className="btn-primary px-5 py-2 text-xs">
                START SCAN
              </Link>
              <Link href="/history" className="btn-ghost px-5 py-2 text-xs">
                RECENT SCANS
              </Link>
              <a
                href="https://github.com/imxyanua/XyaVora-Scan"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost px-5 py-2 text-xs"
              >
                GITHUB
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["No Account", "Scan without registration or user profiles."],
              ["Live Results", "Cards render as each module finishes."],
              ["Local Recent", "Guest history stays in browser storage."],
            ].map(([title, body]) => (
              <div key={title} className="card-panel p-4">
                <p className="font-mono text-sm font-bold text-primary-fixed">{title}</p>
                <p className="font-mono text-[11px] text-primary-fixed/50 leading-relaxed mt-2">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <section>
          <h2 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase border-b border-primary-fixed/20 pb-2 mb-4">
            HOW SCANS WORK
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {FLOW.map((item, index) => (
              <div key={item.title} className="card-panel p-4">
                <span className="font-mono text-[10px] text-primary-fixed/35">STEP_{String(index + 1).padStart(2, "0")}</span>
                <h3 className="font-mono text-sm font-bold text-primary-fixed mt-2">{item.title}</h3>
                <p className="font-mono text-[11px] text-primary-fixed/50 leading-relaxed mt-2">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase border-b border-primary-fixed/20 pb-2 mb-4">
            MODULE REFERENCE
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MODULES.map((module) => (
              <div key={module.key} className="card-panel p-4 flex gap-4">
                <AppIcon name={module.icon} className="text-primary-fixed text-[22px] shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-primary-fixed">{module.label}</span>
                    <span className="font-mono text-[9px] text-primary-fixed/30 border border-primary-fixed/20 px-1">{module.key}</span>
                  </div>
                  <p className="font-mono text-[11px] text-primary-fixed/50 leading-relaxed">{module.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase border-b border-primary-fixed/20 pb-2 mb-4">
            FAQ
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
