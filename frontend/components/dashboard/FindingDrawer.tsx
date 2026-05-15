"use client";

import { useEffect } from "react";
import type { Finding, FindingSeverity, FindingStatus } from "@/types";
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
          <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest block mb-1">
            &gt; FINDING_DETAIL
          </span>
          <h2 className="font-mono text-sm font-bold text-primary-fixed leading-snug">
            {finding.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 text-primary-fixed/40 hover:text-primary-fixed transition-colors mt-0.5"
        >
          <AppIcon name="close" className="text-xl" />
        </button>
      </div>

      {/* Meta row */}
      <div className="px-4 py-3 border-b border-primary-fixed/10 flex items-center gap-3 shrink-0 bg-[#0A1018]">
        <span className={`font-mono text-[10px] uppercase border px-2 py-0.5 ${sevClass}`}>
          {finding.severity.toUpperCase()}
        </span>
        <span className={STATUS_CLASS[finding.status]}>
          [{STATUS_LABEL[finding.status]}]
        </span>
        <span className="font-mono text-[10px] text-primary-fixed/40 uppercase tracking-widest ml-auto">
          {finding.category}
        </span>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Description */}
        <section>
          <p className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest mb-2">
            &gt; DESCRIPTION:
          </p>
          <p className="font-mono text-sm text-primary-fixed/70 leading-relaxed">
            {finding.description}
          </p>
        </section>

        {/* Impact */}
        {finding.impact && (
          <section>
            <p className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest mb-2">
              &gt; IMPACT:
            </p>
            <div className="border-l-2 border-status-warn pl-3">
              <p className="font-mono text-sm text-status-warn/80 leading-relaxed">
                {finding.impact}
              </p>
            </div>
          </section>
        )}

        {/* Recommendation */}
        <section>
          <p className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest mb-2">
            &gt; RECOMMENDATION:
          </p>
          <div className="bg-primary-fixed/[0.04] border border-primary-fixed/15 p-3">
            <p className="font-mono text-sm text-primary-fixed/80 leading-relaxed whitespace-pre-wrap">
              {finding.recommendation}
            </p>
          </div>
        </section>

      </div>

      {/* Footer */}
      <div className="p-4 border-t border-primary-fixed/15 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost w-full py-2 text-xs"
        >
          &gt; CLOSE_PANEL
        </button>
      </div>
    </>
  );
}
