import Link from "next/link";
import { ScanInput } from "@/components/landing/ScanInput";

const DNS_PREVIEW = [
  { n: "01", type: "A",    val: "142.250.190.78"                     },
  { n: "02", type: "AAAA", val: "2607:f8b0:4005:805::200e"           },
  { n: "03", type: "MX",   val: "smtp.google.com"                    },
  { n: "04", type: "TXT",  val: "v=spf1 include:_spf.google.com ~all"},
];

const HEADER_PREVIEW = [
  { label: "HSTS",           status: "pass" },
  { label: "X-Frame-Options",status: "pass" },
  { label: "CSP",            status: "fail" },
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
      <header className="w-full flex justify-between items-center px-8 h-16 z-50 border-b border-outline-variant bg-[#070b0f]/90 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary-fixed text-2xl">radar</span>
          <span className="font-mono text-xl font-bold text-primary-fixed tracking-tighter uppercase">
            XyaVora-Scan
          </span>
        </div>

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
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-200 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">code</span>
            GitHub
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/scan"
            className="hidden md:flex font-mono text-xs tracking-widest uppercase border border-outline-variant text-primary-fixed px-4 py-2 hover:bg-primary-fixed/10 transition-colors duration-200"
          >
            LOGIN
          </Link>
          <span className="material-symbols-outlined md:hidden text-on-surface cursor-pointer">
            menu
          </span>
        </div>
      </header>

      {/* ── Main Hero ── */}
      <main className="flex-grow flex items-center justify-center relative z-10 pt-20 pb-32">
        <div className="w-full max-w-[1440px] px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">

          {/* Left — copy & input */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-8">

            {/* Release badge */}
            <div className="inline-flex items-center gap-2 bg-primary-fixed/10 panel-border px-3 py-1.5 w-max">
              <span className="material-symbols-outlined text-primary-fixed text-sm">rocket_launch</span>
              <span className="font-mono text-[11px] tracking-widest font-semibold text-primary-fixed uppercase">
                V.2.4.0-STABLE RELEASED
              </span>
            </div>

            {/* Headline */}
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

            {/* Scan input — client component */}
            <ScanInput />

            {/* Info pills */}
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

          {/* Right — bento preview grid */}
          <div className="lg:col-span-6 relative flex items-center">
            <div className="w-full grid grid-cols-2 gap-4 font-mono">

              {/* DNS panel — full width */}
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
                    <div
                      key={row.n}
                      className="flex justify-between items-center border-b border-[#223042] pb-1 last:border-b-0 last:pb-0 hover:bg-[#141E29] transition-colors px-1"
                    >
                      <span className="text-primary-fixed/60 w-6 shrink-0">{row.n}</span>
                      <span className="w-14 shrink-0 text-on-surface-variant">{row.type}</span>
                      <span className="text-primary-fixed text-right truncate">{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SSL mini panel */}
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

              {/* Headers mini panel */}
              <div className="bg-[#0F1720] panel-border flex flex-col">
                <div className="border-b border-primary-fixed/30 px-4 py-2 bg-[#070B0F]">
                  <span className="text-[11px] tracking-widest font-semibold text-primary-fixed flex items-center gap-2 uppercase">
                    <span className="material-symbols-outlined text-[14px]">http</span>
                    SEC_HEADERS
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-2 text-[11px] text-on-surface-variant flex-1">
                  {HEADER_PREVIEW.map((h, i) => (
                    <div
                      key={h.label}
                      className={`flex items-center justify-between ${i < HEADER_PREVIEW.length - 1 ? "border-b border-[#223042] pb-2" : ""}`}
                    >
                      <span>{h.label}</span>
                      <span className={h.status === "pass" ? "status-pass" : "status-fail"}>
                        {h.status === "pass" ? "[PASS]" : "[FAIL]"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating scanning chip — xl only */}
              <div className="absolute -right-8 top-1/4 bg-[#0F1720] border border-primary-fixed p-3 cyber-glow hidden xl:flex flex-col gap-2 z-10">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-fixed text-[16px] animate-spin">
                    sync
                  </span>
                  <span className="text-[11px] text-primary-fixed">ANALYZING_RISK_SIGNALS</span>
                </div>
                <div className="flex gap-[2px]">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-2 w-4 bg-primary-fixed" />
                  ))}
                  {[5, 6].map((i) => (
                    <div key={i} className="h-2 w-4 bg-[#223042]" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
