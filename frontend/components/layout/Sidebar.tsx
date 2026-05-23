"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon } from "@/components/ui/AppIcon";

const NAV_ITEMS = [
  { label: "Scan",    icon: "radar",   href: "/scan"    },
  { label: "Recent",  icon: "history", href: "/history" },
] as const;

const BOTTOM_ITEMS = [
  { label: "Help",    icon: "help", href: "/support" },
] as const;

function getActive(href: string, pathname: string): boolean {
  if (href === "#") return false;
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex flex-col bg-[#070B0F] fixed left-0 top-0 h-full w-64 border-r border-[#223042] z-30 pt-16 pb-8 px-4">
      {/* Brand */}
      <Link href="/" className="mb-8 px-4 block group">
        <p className="font-mono text-lg font-bold text-primary-fixed tracking-tight uppercase group-hover:text-white transition-colors">
          XyaVora-Scan
        </p>
        <p className="font-mono text-[11px] text-primary-fixed/50 mt-1">
          [PUBLIC.SCANNER]
        </p>
      </Link>

      {/* Initiate Scan CTA */}
      <Link
        href="/scan"
        className="btn-primary w-full py-2.5 mb-6 text-center text-xs tracking-widest"
      >
        &gt; SCAN DOMAIN
      </Link>

      {/* Main nav */}
      <div className="flex-1 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = getActive(item.href, pathname);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center px-4 py-3 transition-all duration-200 ${
                active
                  ? "bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/50 border-l-4 border-l-primary-fixed"
                  : "text-primary-fixed/60 hover:text-primary-fixed hover:bg-primary-fixed/10 border border-transparent hover:border-primary-fixed/30"
              }`}
            >
              <AppIcon
                name={item.icon}
                className={`mr-3 text-[20px] ${
                  active ? "text-primary-fixed" : "text-primary-fixed/60"
                }`}
              />
              <span className="font-mono text-[11px] tracking-widest uppercase">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div className="mt-auto pt-4 border-t border-[#223042] space-y-0.5">
        {BOTTOM_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center px-4 py-2 text-primary-fixed/50 hover:text-primary-fixed hover:bg-primary-fixed/10 border border-transparent hover:border-primary-fixed/30 transition-all duration-200"
          >
            <AppIcon name={item.icon} className="mr-3 text-[18px]" />
            <span className="font-mono text-[11px] tracking-widest uppercase">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
