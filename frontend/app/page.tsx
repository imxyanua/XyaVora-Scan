import Link from "next/link";
import { ScanInput } from "@/components/landing/ScanInput";
import { ScanLink } from "@/components/scan/ScanLink";

const DNS_PREVIEW = [
  { n: "01", type: "A",    val: "142.250.190.78"                     },
  { n: "02", type: "AAAA", val: "2607:f8b0:4005:805::200e"           },
  { n: "03", type: "MX",   val: "smtp.google.com"                    },
  { n: "04", type: "TXT",  val: "v=spf1 include:_spf.google.com ~all"},
];

const HEADER_PREVIEW = [
  { label: "HSTS",            status: "pass" },
  { label: "X-Frame-Options", status: "pass" },
  { label: "CSP",             status: "fail" },
];

const FEATURES = [
  { icon: "dns",              label: "DNS Analysis",        desc: "Full record dump — A, AAAA, MX, NS, TXT, SPF, DMARC detection"         },
  { icon: "lock",             label: "SSL / TLS",           desc: "Issuer, expiry, protocol version, SAN domains, trust chain check"       },
  { icon: "http",             label: "Security Headers",    desc: "HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy"        },
  { icon: "person_search",    label: "WHOIS",               desc: "Registrar, creation/expiry dates, nameservers, DNSSEC status"           },
  { icon: "stacks",           label: "Tech Stack",          desc: "85+ fingerprint rules — frameworks, CDN, CMS, analytics, hosting"       },
  { icon: "cookie",           label: "Cookie Audit",        desc: "Secure, HttpOnly, SameSite flags per cookie — finds insecure cookies"   },
  { icon: "security",         label: "Security.txt",        desc: "RFC 9116 compliance check — contact, policy, encryption key presence"   },
  { icon: "screenshot_monitor",label: "Live Screenshot",   desc: "Desktop (1280×720) + mobile (390×844) Playwright capture"               },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Enter a Domain",
    desc: "Type any public domain — no login, no API key, no account required. We handle the rest.",
    icon: "edit",
  },
  {
    step: "02",
    title: "8 Analyzers Run in Parallel",
    desc: "DNS, SSL, headers, WHOIS, tech stack, cookies, security.txt, and screenshot — all concurrent.",
    icon: "hub",
  },
  {
    step: "03",
    title: "Get a Risk-Graded Report",
    desc: "Findings are scored A–F with actionable advisories. Export PDF or re-scan any time.",
    icon: "monitoring",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-x-hidden">
      {/* ── Decorative scan lines ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20 z-0">
        <div className="scan-line absolute left-[20%] top-0 bottom-0 w-px h-full" />
        <div className="scan-line absolute left-[50%] top-0 bottom-0 w-px h-full opacity-50" />
        <div className="scan-line absolute left-[80%] top-0 bottom-0 w-px h-full" />
      </div>

      {/* ── Header ── */}
      <header className="w-full flex justify-between items-center px-6 md:px-8 h-16 z-50 border-b border-outline-variant bg-[#070b0f]/90 backdrop-blur-md sticky top-0">
        <Link href="/" className="flex items-center gap-4 group">
          <span className="material-symbols-outlined text-primary-fixed text-2xl">radar</span>
          <span className="font-mono text-xl font-bold text-primary-fixed tracking-tighter uppercase group-hover:text-white transition-colors">
            XyaVora-Scan
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Features",     href: "#features"     },
            { label: "How it works", href: "#how-it-works" },
            { label: "Demo",         href: "#demo"          },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="font-mono text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-200"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          href="/scan"
          className="font-mono text-xs tracking-widest uppercase border border-outline-variant text-primary-fixed px-4 py-2 hover:bg-primary-fixed/10 transition-colors duration-200"
        >
          START SCAN
        </Link>
      </header>

      {/* ── Hero ── */}
      <main className="flex-grow relative z-10">
        <section className="flex items-center justify-center pt-20 pb-32 px-6 md:px-8">
          <div className="w-full max-w-[1440px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">

            {/* Left — copy & input */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-8">

              <div className="inline-flex items-center gap-2 bg-primary-fixed/10 panel-border px-3 py-1.5 w-max">
                <span className="material-symbols-outlined text-primary-fixed text-sm">rocket_launch</span>
                <span className="font-mono text-[11px] tracking-widest font-semibold text-primary-fixed uppercase">
                  V.2.4.0-STABLE — 8 ANALYZERS
                </span>
              </div>

              <div className="space-y-4">
                <h1
                  className="font-sans font-bold text-on-surface leading-[1.1]"
                  style={{ fontSize: "clamp(2.5rem, 5vw, 3rem)", letterSpacing: "-0.02em" }}
                >
                  X-Ray Vision for Your{" "}
                  <span className="text-primary-fixed block lg:inline">Website Security</span>
                </h1>
                <p className="font-sans text-base text-on-surface-variant max-w-xl leading-relaxed">
                  Analyze DNS, SSL, headers, WHOIS, technologies, cookies and risk signals in seconds.
                  A brutalist, high-performance OSINT tool built for security operatives.
                </p>
              </div>

              <ScanInput />

              <div className="flex flex-wrap items-center gap-6 font-mono text-[11px] text-on-surface-variant opacity-70">
                <span className="flex items-center gap-2">
                  <span className="text-primary-fixed">[*]</span> No signup required
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-primary-fixed">[*]</span> Real-time results
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-primary-fixed">[*]</span> 100% passive analysis
                </span>
              </div>
            </div>

            {/* Right — bento preview */}
            <div className="lg:col-span-6 relative flex items-center">
              <div className="w-full grid grid-cols-2 gap-4 font-mono">

                <div className="col-span-2 bg-[#0F1720] panel-border flex flex-col shadow-lg overflow-hidden">
                  <div className="border-b border-primary-fixed/30 px-4 py-2 flex items-center justify-between bg-[#070B0F]">
                    <span className="text-[11px] tracking-widest font-semibold text-primary-fixed flex items-center gap-2 uppercase">
                      <span className="material-symbols-outlined text-[14px]">dns</span>
                      DNS_RESOLUTION
                    </span>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-error/50" />
                      <div className="w-2 h-2 rounded-full bg-secondary-fixed/50" />
                      <div className="w-2 h-2 rounded-full bg-primary-fixed/50" />
                    </div>
                  </div>
                  <div className="p-4 text-sm text-on-surface-variant space-y-2">
                    {DNS_PREVIEW.map((row) => (
                      <div key={row.n} className="flex justify-between items-center border-b border-[#223042] pb-1 last:border-b-0 last:pb-0 hover:bg-[#141E29] transition-colors px-1">
                        <span className="text-primary-fixed/60 w-6 shrink-0">{row.n}</span>
                        <span className="w-14 shrink-0 text-on-surface-variant">{row.type}</span>
                        <span className="text-primary-fixed text-right truncate">{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#0F1720] panel-border flex flex-col">
                  <div className="border-b border-primary-fixed/30 px-4 py-2 bg-[#070B0F]">
                    <span className="text-[11px] tracking-widest font-semibold text-primary-fixed flex items-center gap-2 uppercase">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      SSL_TLS
                    </span>
                  </div>
                  <div className="p-4 flex flex-col items-center justify-center gap-3 flex-1">
                    <div className="bg-primary-fixed/10 border border-primary-fixed/50 px-3 py-1 flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary-fixed animate-pulse shrink-0" />
                      <span className="text-sm text-primary-fixed whitespace-nowrap">VALID (62 DAYS)</span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant text-center">
                      [OK] TLS 1.3 / Google Trust Services
                    </p>
                  </div>
                </div>

                <div className="bg-[#0F1720] panel-border flex flex-col">
                  <div className="border-b border-primary-fixed/30 px-4 py-2 bg-[#070B0F]">
                    <span className="text-[11px] tracking-widest font-semibold text-primary-fixed flex items-center gap-2 uppercase">
                      <span className="material-symbols-outlined text-[14px]">http</span>
                      SEC_HEADERS
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-2 text-[11px] text-on-surface-variant flex-1">
                    {HEADER_PREVIEW.map((h, i) => (
                      <div key={h.label} className={`flex items-center justify-between ${i < HEADER_PREVIEW.length - 1 ? "border-b border-[#223042] pb-2" : ""}`}>
                        <span>{h.label}</span>
                        <span className={h.status === "pass" ? "status-pass" : "status-fail"}>
                          {h.status === "pass" ? "[PASS]" : "[FAIL]"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute -right-8 top-1/4 bg-[#0F1720] border border-primary-fixed p-3 cyber-glow hidden xl:flex flex-col gap-2 z-10">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-fixed text-[16px] animate-spin">sync</span>
                    <span className="text-[11px] text-primary-fixed">ANALYZING_RISK_SIGNALS</span>
                  </div>
                  <div className="flex gap-[2px]">
                    {[1,2,3,4].map((i) => <div key={i} className="h-2 w-4 bg-primary-fixed" />)}
                    {[5,6].map((i)   => <div key={i} className="h-2 w-4 bg-[#223042]" />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="px-6 md:px-8 py-20 border-t border-primary-fixed/10">
          <div className="w-full max-w-[1440px] mx-auto">
            <div className="mb-12 text-center">
              <span className="font-mono text-[10px] text-primary-fixed/40 uppercase tracking-widest block mb-2">
                &gt; SYS.CAPABILITY_MATRIX
              </span>
              <h2 className="font-sans font-bold text-2xl md:text-3xl text-on-surface">
                8 Analyzers. One Scan.
              </h2>
              <p className="font-sans text-sm text-on-surface-variant mt-2 max-w-xl mx-auto">
                Every module runs concurrently — full results in under 30 seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((f) => (
                <div key={f.label} className="card-panel p-5 flex flex-col gap-3 glow-hover transition-all">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary-fixed text-[22px]">{f.icon}</span>
                    <span className="font-mono text-[11px] font-bold text-primary-fixed uppercase tracking-wider">{f.label}</span>
                  </div>
                  <p className="font-mono text-[11px] text-primary-fixed/50 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="px-6 md:px-8 py-20 border-t border-primary-fixed/10">
          <div className="w-full max-w-[1440px] mx-auto">
            <div className="mb-12 text-center">
              <span className="font-mono text-[10px] text-primary-fixed/40 uppercase tracking-widest block mb-2">
                &gt; SYS.PROCESS_FLOW
              </span>
              <h2 className="font-sans font-bold text-2xl md:text-3xl text-on-surface">
                How It Works
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-8 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-primary-fixed/20" />

              {HOW_IT_WORKS.map((step) => (
                <div key={step.step} className="flex flex-col items-center text-center gap-4 relative z-10">
                  <div className="w-16 h-16 border border-primary-fixed/40 bg-[#070B0F] flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary-fixed text-[28px]">{step.icon}</span>
                  </div>
                  <span className="font-mono text-[10px] text-primary-fixed/40 tracking-widest">[STEP_{step.step}]</span>
                  <h3 className="font-mono text-sm font-bold text-primary-fixed">{step.title}</h3>
                  <p className="font-mono text-[11px] text-primary-fixed/50 leading-relaxed max-w-xs">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Demo / CTA ── */}
        <section id="demo" className="px-6 md:px-8 py-20 border-t border-primary-fixed/10">
          <div className="w-full max-w-[1440px] mx-auto">
            <div className="card-panel p-10 md:p-16 text-center space-y-6">
              <span className="font-mono text-[10px] text-primary-fixed/40 uppercase tracking-widest block">
                &gt; SYS.LIVE_DEMO
              </span>
              <h2 className="font-sans font-bold text-2xl md:text-4xl text-on-surface">
                Try it on a real domain
              </h2>
              <p className="font-mono text-[11px] text-primary-fixed/50 max-w-lg mx-auto">
                No account needed. Results in under 30 seconds. Scan any public domain right now.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {["github.com", "cloudflare.com", "mozilla.org"].map((d) => (
                  <ScanLink
                    key={d}
                    target={d}
                    className="btn-ghost px-5 py-2.5 text-xs"
                  >
                    Scan {d} &gt;
                  </ScanLink>
                ))}
              </div>
              <div className="pt-4">
                <Link href="/scan" className="btn-primary px-10 py-3 text-sm inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">radar</span>
                  LAUNCH FULL APP
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-primary-fixed/10 px-6 md:px-8 py-8">
          <div className="w-full max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="material-symbols-outlined text-primary-fixed text-xl">radar</span>
              <span className="font-mono text-sm font-bold text-primary-fixed uppercase group-hover:text-white transition-colors">XyaVora-Scan</span>
              <span className="font-mono text-[10px] text-primary-fixed/30">[V.2.4.0-STABLE]</span>
            </Link>
            <p className="font-mono text-[10px] text-primary-fixed/30">
              Passive OSINT only — no active exploitation, no data stored beyond session cache.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
