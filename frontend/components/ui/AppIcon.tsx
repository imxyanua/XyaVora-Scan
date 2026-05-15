import type { ReactNode } from "react";

type AppIconProps = {
  name: string;
  className?: string;
  title?: string;
};

const ICONS: Record<string, ReactNode> = {
  account_circle: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M6 20c1.2-3.2 3.2-5 6-5s4.8 1.8 6 5" />
      <circle cx="12" cy="12" r="10" />
    </>
  ),
  check_circle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 2.5 2.5L16.5 9" />
    </>
  ),
  chevron_right: <path d="m9 6 6 6-6 6" />,
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  code: (
    <>
      <path d="m9 18-6-6 6-6" />
      <path d="m15 6 6 6-6 6" />
    </>
  ),
  cookie: (
    <>
      <path d="M20 13.5A8 8 0 1 1 10.5 4 4 4 0 0 0 20 13.5Z" />
      <circle cx="8.5" cy="10.5" r=".5" />
      <circle cx="12" cy="15" r=".5" />
      <circle cx="14.5" cy="9" r=".5" />
    </>
  ),
  dns: (
    <>
      <rect x="4" y="4" width="16" height="5" rx="1" />
      <rect x="4" y="15" width="16" height="5" rx="1" />
      <path d="M7 9v6" />
      <path d="M17 9v6" />
      <path d="M7 6.5h.01" />
      <path d="M7 17.5h.01" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7v6" />
      <path d="M12 17h.01" />
    </>
  ),
  expand_more: <path d="m6 9 6 6 6-6" />,
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 9a2.7 2.7 0 0 1 5.2.9c0 2.1-2.7 2.3-2.7 4.1" />
      <path d="M12 17h.01" />
    </>
  ),
  hide_image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="m4 4 16 16" />
      <path d="m8 13 2-2 3 3" />
      <path d="m14 10 1-1 5 5" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  http: (
    <>
      <path d="M7 8H4v8h3" />
      <path d="M17 8h3v8h-3" />
      <path d="m10 17 4-10" />
    </>
  ),
  hub: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="5" cy="5" r="2" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="m7 7 3 3" />
      <path d="m17 7-3 3" />
      <path d="m7 17 3-3" />
      <path d="m17 17-3-3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  monitoring: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 4-4 3 3 5-7" />
    </>
  ),
  notifications: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  person_search: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c1-3 3-5 6-5 1.5 0 2.7.4 3.7 1.2" />
      <circle cx="17" cy="17" r="3" />
      <path d="m20 20-1.5-1.5" />
    </>
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 12 19 5" />
      <path d="M12 3v3" />
      <path d="M21 12h-3" />
      <path d="M12 21v-3" />
      <path d="M3 12h3" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 6v6h-6" />
      <path d="M4 18v-6h6" />
      <path d="M19 12a7 7 0 0 0-12-5L4 10" />
      <path d="M5 12a7 7 0 0 0 12 5l3-3" />
    </>
  ),
  rocket_launch: (
    <>
      <path d="M5 19c1.5-4.5 4.5-9.5 12-12 0 7.5-7.5 12-12 12Z" />
      <path d="M9 15 5 19" />
      <path d="M14 6l4-3 3 3-3 4" />
      <circle cx="14" cy="10" r="1.5" />
    </>
  ),
  screenshot_monitor: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="m8 12 2-2 3 3 2-2 3 3" />
    </>
  ),
  security: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  space_dashboard: (
    <>
      <rect x="3" y="3" width="7" height="8" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="15" width="7" height="6" rx="1" />
    </>
  ),
  stacks: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 16 9 5 9-5" />
    </>
  ),
  sync: (
    <>
      <path d="M17 3v5h-5" />
      <path d="M7 21v-5h5" />
      <path d="M17 8a7 7 0 0 0-11.4 2" />
      <path d="M7 16a7 7 0 0 0 11.4-2" />
    </>
  ),
  terminal: (
    <>
      <path d="m4 7 5 5-5 5" />
      <path d="M11 17h9" />
    </>
  ),
  travel_explore: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="M4 10h12" />
      <path d="M10 4c2 2 2 10 0 12" />
      <path d="M10 4c-2 2-2 10 0 12" />
      <path d="m15 15 5 5" />
    </>
  ),
  tune: (
    <>
      <path d="M4 6h10" />
      <path d="M18 6h2" />
      <path d="M4 12h4" />
      <path d="M12 12h8" />
      <path d="M4 18h12" />
      <path d="M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
};

export function AppIcon({ name, className = "", title }: AppIconProps) {
  const icon = ICONS[name] ?? ICONS.help;

  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={`inline-block ${className}`}
      fill="none"
      focusable="false"
      role={title ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      style={{ width: "1em", height: "1em" }}
      viewBox="0 0 24 24"
    >
      {title ? <title>{title}</title> : null}
      {icon}
    </svg>
  );
}
