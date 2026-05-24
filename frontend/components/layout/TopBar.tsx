"use client";

import Link from "next/link";
import { startScan } from "@/lib/startScan";
import { AppIcon } from "@/components/ui/AppIcon";

interface TopBarProps {
  domain?: string;
}

export function TopBar({ domain }: TopBarProps) {
  return (
    <header className="bg-[#070B0F]/90 backdrop-blur-sm border-b border-primary-fixed/20 flex justify-between items-center w-full px-8 h-16 z-40 sticky top-0 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <Link
          href="/"
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
              onClick={() => startScan(domain)}
              className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
            >
              <AppIcon name="refresh" className="text-[16px]" />
              <span className="hidden sm:inline">RESCAN</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-primary px-3 py-1.5 text-xs hidden sm:flex items-center gap-1.5"
            >
              <AppIcon name="download" className="text-[16px]" />
              EXPORT PDF
            </button>
          </>
        )}

        <div className="h-6 w-px bg-primary-fixed/20 mx-1 hidden sm:block" />

        <Link
          href="/support"
          className="text-primary-fixed/45 hover:text-primary-fixed transition-colors p-1 hidden sm:block"
          aria-label="Help"
        >
          <AppIcon name="help" className="text-xl" />
        </Link>
        <a
          href="https://github.com/imxyanua/XyaVora-Scan"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-fixed/45 hover:text-primary-fixed transition-colors p-1 hidden sm:block"
          aria-label="GitHub"
        >
          <AppIcon name="code" className="text-xl" />
        </a>
      </div>
    </header>
  );
}
