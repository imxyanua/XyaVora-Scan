"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import type { Finding, FindingClassification, FindingConfidence, FindingSeverity, FindingSource, FindingStatus } from "@/types";
import { AppIcon } from "@/components/ui/AppIcon";

interface Props {
  finding: Finding | null;
  onClose: () => void;
}

const SEVERITY_CLASS: Record<FindingSeverity, string> = {
  high:   "text-error   border-error",
  medium: "text-status-warn border-status-warn",
  low:    "text-secondary-fixed border-secondary-fixed",
  info:   "text-primary-fixed/50 border-primary-fixed/30",
};

const CLASSIFICATION_CLASS: Record<FindingClassification, string> = {
  "verified-issue": "border-error/70 bg-error/5 text-error",
  "observed-risk": "border-status-warn/70 bg-status-warn/5 text-status-warn",
  "hardening-recommendation": "border-primary-fixed/40 bg-primary-fixed/[0.04] text-primary-fixed",
  "investigation-lead": "border-secondary-fixed/60 bg-secondary-fixed/[0.04] text-secondary-fixed",
  informational: "border-primary-fixed/25 bg-primary-fixed/[0.03] text-primary-fixed/65",
};

const STATUS_CLASS: Record<FindingStatus, string> = {
  fail:    "status-badge status-fail",
  warning: "status-badge status-warn",
  pass:    "status-badge status-pass",
  info:    "status-badge",
};

const STATUS_LABEL: Record<FindingStatus, string> = {
  fail:    "FAIL",
  warning: "WARN",
  pass:    "PASS",
  info:    "INFO",
};

const CONFIDENCE_LABEL: Record<FindingConfidence, string> = {
  verified: "Verified",
  observed: "Observed",
  inferred: "Inferred",
  "best-practice": "Best practice",
};

const CONFIDENCE_HELP: Record<FindingConfidence, string> = {
  verified: "Confirmed from a direct protocol result, such as TLS, DNS, or a parsed response value.",
  observed: "Observed in the live response, but still represents scanner interpretation of that response.",
  inferred: "Inferred from indirect signals. Treat this as a lead to verify manually.",
  "best-practice": "A recommended hardening control is missing or weak. This is not proof of an exploitable vulnerability.",
};

const SOURCE_LABEL: Record<FindingSource, string> = {
  dns: "DNS",
  tls: "TLS",
  headers: "HTTP headers",
  http: "HTTP fetch",
  html: "HTML",
  cookie: "Cookie",
  whois: "WHOIS",
  scanner: "Scanner rule",
};

const CLASSIFICATION_LABEL: Record<FindingClassification, string> = {
  "verified-issue": "Verified issue",
  "observed-risk": "Observed risk",
  "hardening-recommendation": "Hardening recommendation",
  "investigation-lead": "Investigation lead",
  informational: "Informational",
};

const CLASSIFICATION_HELP: Record<FindingClassification, string> = {
  "verified-issue": "The scanner directly verified the condition through a protocol result or parsed response.",
  "observed-risk": "The scanner observed supporting evidence in the live response, but the impact still depends on context.",
  "hardening-recommendation": "A defensive control is missing or weak. This is a recommendation, not proof of exploitation.",
  "investigation-lead": "This is inferred from indirect signals and should be manually validated.",
  informational: "This item is context for the report and is not an issue by itself.",
};

function Section({
  title,
  children,
  tone = "default",
}: {
  title: string;
  children: ReactNode;
  tone?: "default" | "warn" | "primary";
}) {
  const toneClass = tone === "warn"
    ? "border-status-warn/35 bg-status-warn/[0.04]"
    : tone === "primary"
      ? "border-primary-fixed/20 bg-primary-fixed/[0.04]"
      : "border-primary-fixed/15 bg-[#070B0F]";

  return (
    <section>
      <p className="font-mono text-[11px] text-primary-fixed/65 uppercase tracking-widest mb-2">
        {title}
      </p>
      <div className={`border p-3 ${toneClass}`}>
        {children}
      </div>
    </section>
  );
}

export function FindingDrawer({ finding, onClose }: Props) {
  useEffect(() => {
    if (!finding) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [finding, onClose]);

  const open = finding !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-[#070B0F]/70 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className={`fixed top-0 right-0 z-60 h-full w-full max-w-xl bg-[#0F1720] border-l border-primary-fixed/20 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {finding && <DrawerContent finding={finding} onClose={onClose} />}
      </aside>
    </>
  );
}

function DrawerContent({ finding, onClose }: { finding: Finding; onClose: () => void }) {
  const sevClass = SEVERITY_CLASS[finding.severity];
  const classificationClass = finding.classification
    ? CLASSIFICATION_CLASS[finding.classification]
    : "border-primary-fixed/20 bg-primary-fixed/[0.03] text-primary-fixed/65";

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-primary-fixed/20 bg-[#070B0F] flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <span className="font-mono text-[11px] text-primary-fixed/60 uppercase tracking-widest block mb-1">
            Finding Detail
          </span>
          <h2 className="font-mono text-base font-bold text-primary-fixed leading-snug">
            {finding.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 text-primary-fixed/60 hover:text-primary-fixed transition-colors mt-0.5"
        >
          <AppIcon name="close" className="text-xl" />
        </button>
      </div>

      {/* Meta row */}
      <div className="px-4 py-3 border-b border-primary-fixed/10 flex items-center gap-3 shrink-0 bg-[#0A1018]">
        <span className={`font-mono text-[11px] uppercase border px-2 py-0.5 ${sevClass}`}>
          {finding.severity.toUpperCase()}
        </span>
        <span className={STATUS_CLASS[finding.status]}>
          [{STATUS_LABEL[finding.status]}]
        </span>
        <span className="font-mono text-[11px] text-primary-fixed/65 uppercase tracking-widest ml-auto">
          {finding.category}
        </span>
      </div>

      {(finding.confidence || finding.source || finding.classification) && (
        <div className="px-4 py-3 border-b border-primary-fixed/10 grid grid-cols-1 gap-3 shrink-0 bg-[#101720] sm:grid-cols-3">
          {finding.classification && (
            <div className={`border px-3 py-2 ${classificationClass}`}>
              <p className="font-mono text-[10px] text-primary-fixed/45 uppercase tracking-widest">Classification</p>
              <p className="font-mono text-[13px] mt-1 font-bold">
                {CLASSIFICATION_LABEL[finding.classification]}
              </p>
              <p className="font-mono text-[11px] text-[#d7e8ff]/60 mt-1 leading-relaxed">
                {CLASSIFICATION_HELP[finding.classification]}
              </p>
            </div>
          )}
          <div>
            <p className="font-mono text-[10px] text-primary-fixed/45 uppercase tracking-widest">Confidence</p>
            <p className="font-mono text-[13px] text-[#d7e8ff]/75 mt-1">
              {finding.confidence ? CONFIDENCE_LABEL[finding.confidence] : "Unknown"}
            </p>
            {finding.confidence && (
              <p className="font-mono text-[11px] text-[#d7e8ff]/50 mt-1 leading-relaxed">
                {CONFIDENCE_HELP[finding.confidence]}
              </p>
            )}
          </div>
          <div>
            <p className="font-mono text-[10px] text-primary-fixed/45 uppercase tracking-widest">Source</p>
            <p className="font-mono text-[13px] text-[#d7e8ff]/75 mt-1">
              {finding.source ? SOURCE_LABEL[finding.source] : "Unknown"}
            </p>
          </div>
        </div>
      )}

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        <Section title="Summary">
          <p className="font-mono text-[14px] text-[#d7e8ff]/82 leading-relaxed">
            {finding.description}
          </p>
        </Section>

        {finding.analysis && (
          <Section title="Why The Scanner Flagged It">
            <p className="font-mono text-[14px] text-[#d7e8ff]/78 leading-relaxed">
              {finding.analysis}
            </p>
          </Section>
        )}

        {finding.evidence && finding.evidence.length > 0 && (
          <Section title="Evidence">
            <div className="space-y-1.5">
              {finding.evidence.map((item, index) => (
                <p key={`${item}-${index}`} className="font-mono text-xs text-[#d7e8ff]/75 leading-relaxed break-words">
                  &gt; {item}
                </p>
              ))}
            </div>
          </Section>
        )}

        {/* Impact */}
        {finding.impact && (
          <Section title="Why This Matters" tone="warn">
            <p className="font-mono text-[14px] text-status-warn/85 leading-relaxed">
              {finding.impact}
            </p>
          </Section>
        )}

        {/* Recommendation */}
        <Section title="Recommended Fix" tone="primary">
          <p className="font-mono text-[14px] text-primary-fixed/85 leading-relaxed whitespace-pre-wrap">
            {finding.recommendation}
          </p>
        </Section>

        {finding.verification && (
          <Section title="How To Verify Manually" tone="primary">
            <p className="font-mono text-[14px] text-[#d7e8ff]/80 leading-relaxed whitespace-pre-wrap">
              {finding.verification}
            </p>
          </Section>
        )}

      </div>

      {/* Footer */}
      <div className="p-4 border-t border-primary-fixed/15 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost w-full py-2 text-[13px]"
        >
          &gt; CLOSE_PANEL
        </button>
      </div>
    </>
  );
}
