"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Home",    icon: "dashboard",    href: "/"        },
  { label: "Scan",    icon: "radar",        href: "/scan"    },
  { label: "History", icon: "description",  href: "/history" },
] as const;

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#070B0F] border-t border-primary-fixed/20 flex items-stretch z-50">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, pathname);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              active ? "text-primary-fixed" : "text-primary-fixed/40"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            <span className="font-mono text-[9px] uppercase tracking-widest">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
