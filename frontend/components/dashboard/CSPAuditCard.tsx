import type { HeadersResult, SecurityHeaderItem } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

interface Props {
  headers: HeadersResult;
}

type AuditStatus = "pass" | "warn" | "missing";

type DirectiveAudit = {
  label: string;
  status: AuditStatus;
  value: string;
  note: string;
};

const STATUS: Record<AuditStatus, { badge: string; text: string }> = {
  pass: { badge: "status-pass", text: "[OK]" },
  warn: { badge: "status-warn", text: "[REVIEW]" },
  missing: { badge: "status-missing", text: "[-]" },
};

function findCsp(headers: HeadersResult): SecurityHeaderItem | undefined {
  return headers.securityHeaders.find(
    (item) => item.header.toLowerCase() === "content-security-policy",
  );
}

function parseDirectives(value?: string): Record<string, string[]> {
  if (!value) return {};

  return Object.fromEntries(
    value
      .split(";")
      .map((directive) => directive.trim().split(/\s+/).filter(Boolean))
      .filter((parts) => parts.length > 0)
      .map((parts) => [parts[0].toLowerCase(), parts.slice(1)]),
  );
}

function sourcesFor(directives: Record<string, string[]>, name: string) {
  return directives[name] ?? directives["default-src"] ?? [];
}

function hasSource(sources: string[], source: string) {
  return sources.some((item) => item.toLowerCase() === source);
}

function hasBroadSource(directives: Record<string, string[]>) {
  return Object.values(directives).some((sources) =>
    sources.some((source) => {
      const value = source.toLowerCase();
      return value === "*" || value === "http:" || value === "https:" || value === "data:" || value === "blob:" || value.startsWith("*.");
    }),
  );
}

function buildAudit(header?: SecurityHeaderItem): DirectiveAudit[] {
  if (!header?.value) {
    return [
      {
        label: "Policy",
        status: "missing",
        value: "Not observed",
        note: "The final response did not include an enforced Content-Security-Policy header.",
      },
    ];
  }

  const directives = parseDirectives(header.value);
  const scriptSources = sourcesFor(directives, "script-src");
  const objectSources = sourcesFor(directives, "object-src");
  const baseUri = directives["base-uri"] ?? [];
  const frameAncestors = directives["frame-ancestors"] ?? [];
  const broadSource = hasBroadSource(directives);
  const unsafeInline = hasSource(scriptSources, "'unsafe-inline'");
  const unsafeEval = hasSource(scriptSources, "'unsafe-eval'");
  const objectLocked = hasSource(objectSources, "'none'");
  const baseLocked = hasSource(baseUri, "'none'") || hasSource(baseUri, "'self'");

  return [
    {
      label: "Default Fallback",
      status: directives["default-src"] ? "pass" : "warn",
      value: directives["default-src"]?.join(" ") || "Missing",
      note: "default-src provides fallback restrictions for unspecified resource types.",
    },
    {
      label: "Script Execution",
      status: unsafeInline || unsafeEval || broadSource ? "warn" : "pass",
      value: scriptSources.join(" ") || "Fallback or missing",
      note: "Flags unsafe-inline, unsafe-eval, wildcard, and broad scheme sources.",
    },
    {
      label: "Object Embedding",
      status: objectLocked ? "pass" : "warn",
      value: objectSources.join(" ") || "Fallback or missing",
      note: "object-src 'none' reduces legacy plugin/object injection surface.",
    },
    {
      label: "Base URI",
      status: baseLocked ? "pass" : "warn",
      value: baseUri.join(" ") || "Missing",
      note: "base-uri limits injected base tags from rewriting relative URLs.",
    },
    {
      label: "Frame Ancestors",
      status: frameAncestors.length > 0 ? "pass" : "warn",
      value: frameAncestors.join(" ") || "Missing",
      note: "frame-ancestors is the modern CSP control for clickjacking protection.",
    },
  ];
}

export function CSPAuditCard({ headers }: Props) {
  const csp = findCsp(headers);
  const auditItems = buildAudit(csp);
  const warningCount = auditItems.filter((item) => item.status !== "pass").length;
  const overall = !csp?.value ? "missing" : warningCount > 0 ? "warn" : "pass";
  const detailItems = [
    { label: "Status", value: csp?.status },
    { label: "Header Value", value: csp?.value },
    { label: "Audit Summary", value: auditItems.map((item) => `${item.label}: ${item.status} - ${item.value}`).join("\n") },
    { label: "Evidence", value: csp?.evidence?.join("\n") },
    { label: "Final URL", value: headers.finalUrl },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0">
        <div>
          <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
            CSP Audit
          </h3>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#d7e8ff]/60">
            Directive-level review of browser content execution controls.
          </p>
        </div>
        <span className={`status-badge ${STATUS[overall].badge} text-[10px] shrink-0`}>
          {overall === "pass" ? "Clean" : overall === "warn" ? "Review" : "Missing"}
        </span>
      </div>

      <div className="px-5 pb-3 flex flex-wrap items-center gap-2">
        <SourceQualityBadge source={csp?.value ? "header" : "missing"} />
        <span className="font-mono text-[10px] text-[#d7e8ff]/55">
          Final response header only.
        </span>
      </div>

      <div className="font-mono text-sm flex-1">
        {auditItems.map((item) => {
          const status = STATUS[item.status];
          return (
            <div
              key={item.label}
              className="px-5 py-3 border-t border-primary-fixed/10 hover:bg-primary-fixed/[0.04] transition-colors"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-white">{item.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#d7e8ff]/60">
                    {item.note}
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <span className={`status-badge ${status.badge} text-[10px]`}>
                    {status.text}
                  </span>
                  <p className="mt-1 max-w-[16rem] break-words text-[11px] text-white">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <DetailPanel items={detailItems} label="CSP Audit Details" />
    </div>
  );
}
