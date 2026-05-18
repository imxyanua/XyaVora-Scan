export type SourceQuality =
  | "dns"
  | "tls"
  | "header"
  | "page"
  | "cookie"
  | "inferred"
  | "missing"
  | "estimated";

type Props = {
  source: SourceQuality;
  className?: string;
};

const SOURCE_LABEL: Record<SourceQuality, string> = {
  dns: "Verified by DNS",
  tls: "Verified by TLS",
  header: "Verified by headers",
  page: "Detected from page",
  cookie: "Detected from cookie",
  inferred: "Inferred",
  missing: "Not observed",
  estimated: "Estimated",
};

const SOURCE_STYLE: Record<SourceQuality, string> = {
  dns: "border-primary-fixed/45 text-primary-fixed bg-primary-fixed/10",
  tls: "border-primary-fixed/45 text-primary-fixed bg-primary-fixed/10",
  header: "border-secondary-fixed/45 text-secondary-fixed bg-secondary-fixed/10",
  page: "border-[#d7e8ff]/25 text-[#d7e8ff]/70 bg-[#d7e8ff]/5",
  cookie: "border-[#d7e8ff]/25 text-[#d7e8ff]/70 bg-[#d7e8ff]/5",
  inferred: "border-status-warn/55 text-status-warn bg-status-warn/10",
  missing: "border-white/15 text-white/45 bg-white/[0.03]",
  estimated: "border-status-warn/55 text-status-warn bg-status-warn/10",
};

export function SourceQualityBadge({ source, className = "" }: Props) {
  return (
    <span className={`inline-flex shrink-0 border px-2 py-0.5 font-mono text-[9px] leading-none ${SOURCE_STYLE[source]} ${className}`}>
      {SOURCE_LABEL[source]}
    </span>
  );
}
