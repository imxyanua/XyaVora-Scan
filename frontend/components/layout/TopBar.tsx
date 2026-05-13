"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface TopBarProps {
  domain?: string;
}

export function TopBar({ domain }: TopBarProps) {
  const router = useRouter();

  return (
    <header className="bg-[#070B0F]/90 backdrop-blur-sm border-b border-primary-fixed/20 flex justify-between items-center w-full px-8 h-16 z-40 sticky top-0 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <Link
          href="/landing"
          className="font-mono text-lg font-bold text-primary-fixed tracking-tighter uppercase md:hidden"
        >
          XyaVora-Scan
        </Link>

        {/* Desktop: target host */}
        {domain && (
          <div className="hidden md:flex items-center gap-2">
            <span className="font-mono text-sm text-primary-fixed/50 uppercase tracking-widest">
              TARGET_HOST:
            </span>
            <span className="font-mono text-xl font-bold text-primary-fixed">
              {domain}
            </span>
          </div>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {domain && (
          <>
            <button
              type="button"
              onClick={() =>
                router.push(`/scanning?target=${encodeURIComponent(domain)}`)
              }
              className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span className="hidden sm:inline">RESCAN</span>
            </button>
            <button
              type="button"
              className="btn-primary px-3 py-1.5 text-xs hidden sm:flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              EXPORT PDF
            </button>
          </>
        )}

        <div className="h-6 w-px bg-primary-fixed/20 mx-1 hidden sm:block" />

        {[
          { icon: "terminal",       label: "Terminal"      },
          { icon: "notifications",  label: "Notifications" },
          { icon: "account_circle", label: "Account"       },
        ].map((btn) => (
          <button
            key={btn.icon}
            type="button"
            aria-label={btn.label}
            className="text-primary-fixed/40 hover:text-primary-fixed transition-colors p-1 hidden sm:block"
          >
            <span className="material-symbols-outlined text-xl">{btn.icon}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
