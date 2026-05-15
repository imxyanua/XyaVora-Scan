import Link from "next/link";
import { Suspense } from "react";
import { ScanProgress } from "@/components/scanning/ScanProgress";
import { AppIcon } from "@/components/ui/AppIcon";

export default function ScanningPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Minimal header — no sidebar on this transitional screen */}
      <header className="w-full flex items-center gap-4 px-8 h-16 border-b border-primary-fixed/20 bg-[#070B0F]/90 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3 group">
          <AppIcon name="radar" className="text-primary-fixed text-2xl" />
          <span className="font-mono text-lg font-bold text-primary-fixed tracking-tighter uppercase group-hover:text-white transition-colors">
            XyaVora-Scan
          </span>
        </Link>
        <span className="font-mono text-[11px] text-primary-fixed/30 uppercase tracking-widest hidden sm:block">
          / SCANNING
        </span>
      </header>

      <main className="flex-grow bg-background">
        <Suspense>
          <ScanProgress />
        </Suspense>
      </main>
    </div>
  );
}
