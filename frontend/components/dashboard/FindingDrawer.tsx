"use client";

import { useEffect } from "react";
import type { Finding, FindingConfidence, FindingSeverity, FindingSource, FindingStatus } from "@/types";
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
        className={`fixed top-0 right-0 z-60 h-full w-full max-w-md bg-[#0F1720] border-l border-primary-fixed/20 flex flex-col transition-transform duration-300 ease-in-out ${
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

      {(finding.confidence || finding.source) && (
        <div className="px-4 py-3 border-b border-primary-fixed/10 grid grid-cols-2 gap-2 shrink-0 bg-[#101720]">
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

        {/* Description */}
        <section>
          <p className="font-mono text-[11px] text-primary-fixed/65 uppercase tracking-widest mb-2">
            Description
          </p>
          <p className="font-mono text-[14px] text-primary-fixed/70 leading-relaxed">
            {finding.description}
          </p>
        </section>

        {finding.analysis && (
          <section>
            <p className="font-mono text-[11px] text-primary-fixed/65 uppercase tracking-widest mb-2">
              Why It Appears
            </p>
            <div className="bg-[#070B0F] border border-primary-fixed/15 p-3">
              <p className="font-mono text-[14px] text-[#d7e8ff]/75 leading-relaxed">
                {finding.analysis}
              </p>
            </div>
          </section>
        )}

        {finding.evidence && finding.evidence.length > 0 && (
          <section>
            <p className="font-mono text-[11px] text-primary-fixed/65 uppercase tracking-widest mb-2">
              Evidence
            </p>
            <div className="bg-[#070B0F] border border-primary-fixed/15 p-3 space-y-1">
              {finding.evidence.map((item) => (
                <p key={item} className="font-mono text-xs text-[#d7e8ff]/75 leading-relaxed break-words">
                  &gt; {item}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Impact */}
        {finding.impact && (
          <section>
            <p className="font-mono text-[11px] text-primary-fixed/65 uppercase tracking-widest mb-2">
              Impact
            </p>
            <div className="border-l-2 border-status-warn pl-3">
              <p className="font-mono text-[14px] text-status-warn/80 leading-relaxed">
                {finding.impact}
              </p>
            </div>
          </section>
        )}

        {/* Recommendation */}
        <section>
          <p className="font-mono text-[11px] text-primary-fixed/65 uppercase tracking-widest mb-2">
            Recommendation
          </p>
          <div className="bg-primary-fixed/[0.04] border border-primary-fixed/15 p-3">
            <p className="font-mono text-[14px] text-primary-fixed/80 leading-relaxed whitespace-pre-wrap">
              {finding.recommendation}
            </p>
          </div>
        </section>

        {finding.verification && (
          <section>
            <p className="font-mono text-[11px] text-primary-fixed/65 uppercase tracking-widest mb-2">
              Manual Verification
            </p>
            <div className="bg-primary-fixed/[0.04] border border-primary-fixed/15 p-3">
              <p className="font-mono text-[14px] text-[#d7e8ff]/80 leading-relaxed whitespace-pre-wrap">
                {finding.verification}
              </p>
            </div>
          </section>
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
