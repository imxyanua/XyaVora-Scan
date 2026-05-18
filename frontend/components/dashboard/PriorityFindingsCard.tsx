"use client";

import { useMemo, useState, useCallback } from "react";
import type { Finding, FindingConfidence, FindingSeverity, FindingSource, FindingStatus } from "@/types";
import { FindingDrawer } from "./FindingDrawer";

interface Props {
  findings: Finding[];
}

const STATUS_WEIGHT: Record<FindingStatus, number> = {
  fail: 4,
  warning: 3,
  info: 1,
  pass: 0,
};

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = {
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const SEVERITY_CLASS: Record<FindingSeverity, string> = {
  high: "border-error/70 text-error",
  medium: "border-status-warn/70 text-status-warn",
  low: "border-secondary-fixed/60 text-secondary-fixed",
  info: "border-primary-fixed/30 text-primary-fixed/60",
};

const STATUS_LABEL: Record<FindingStatus, string> = {
  fail: "Needs attention",
  warning: "Review",
  info: "Info",
  pass: "Pass",
};

const CONFIDENCE_LABEL: Record<FindingConfidence, string> = {
  verified: "Verified",
  observed: "Observed",
  inferred: "Inferred",
  "best-practice": "Best practice",
};

const SOURCE_LABEL: Record<FindingSource, string> = {
  dns: "DNS",
  tls: "TLS",
  headers: "Headers",
  http: "HTTP",
  html: "HTML",
  cookie: "Cookie",
  whois: "WHOIS",
  scanner: "Rule",
};

function rankFinding(finding: Finding) {
  return STATUS_WEIGHT[finding.status] * 10 + SEVERITY_WEIGHT[finding.severity];
}

function compactText(value: string, maxLength = 142) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

export function PriorityFindingsCard({ findings }: Props) {
  const [activeFinding, setActiveFinding] = useState<Finding | null>(null);
  const closeFinding = useCallback(() => setActiveFinding(null), []);

  const priorityFindings = useMemo(
    () =>
      [...findings]
        .filter((finding) => finding.status === "fail" || finding.status === "warning")
        .sort((a, b) => rankFinding(b) - rankFinding(a))
        .slice(0, 5),
    [findings],
  );

  const passedCount = findings.filter((finding) => finding.status === "pass").length;
  const observationCount = priorityFindings.length;

  return (
    <>
      <FindingDrawer finding={activeFinding} onClose={closeFinding} />
      <section className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505]">
        <div className="px-5 pt-5 pb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
              Priority Observations
            </h2>
            <p className="font-mono text-[13px] text-[#d7e8ff]/70 mt-2 max-w-3xl leading-relaxed">
              Highest-impact checks that need review. Verified transport/DNS failures are weighted above best-practice observations.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <span className={`status-badge ${observationCount > 0 ? "status-warn" : "status-pass"} text-[10px]`}>
              {observationCount > 0 ? `[${observationCount} REVIEW]` : "[CLEAR]"}
            </span>
            <span className="status-badge status-pass text-[10px]">
              [{passedCount} PASS]
            </span>
          </div>
        </div>

        {priorityFindings.length === 0 ? (
          <div className="mx-5 mb-5 border border-primary-fixed/15 bg-[#151918] p-4">
            <p className="font-mono text-sm text-white font-bold">No priority observations found</p>
            <p className="font-mono text-[13px] text-[#d7e8ff]/70 mt-1">
              The scanner did not find failed or review findings in the current rule set.
            </p>
          </div>
        ) : (
          <div className="px-5 pb-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
            {priorityFindings.map((finding, index) => (
              <article
                key={finding.id}
                className="border border-primary-fixed/15 bg-[#151918] p-4 hover:border-primary-fixed/45 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-[10px] text-primary-fixed/60">
                        #{index + 1}
                      </span>
                      <span className={`font-mono text-[10px] border px-2 py-0.5 ${SEVERITY_CLASS[finding.severity]}`}>
                        {finding.severity.toUpperCase()}
                      </span>
                      <span className="font-mono text-[10px] text-white/60">
                        {STATUS_LABEL[finding.status]} / {finding.category}
                      </span>
                      {finding.confidence && (
                        <span className="font-mono text-[10px] text-[#d7e8ff]/45">
                          {CONFIDENCE_LABEL[finding.confidence]}
                        </span>
                      )}
                      {finding.source && (
                        <span className="font-mono text-[10px] text-[#d7e8ff]/45">
                          src:{SOURCE_LABEL[finding.source]}
                        </span>
                      )}
                    </div>
                    <h3 className="font-mono text-[17px] text-white font-bold leading-snug">
                      {finding.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveFinding(finding)}
                    className="shrink-0 font-mono text-[11px] text-primary-fixed border border-primary-fixed/45 px-2 py-1 hover:bg-primary-fixed hover:text-[#070B0F] transition-colors"
                  >
                    Details
                  </button>
                </div>

                <p className="font-mono text-[13px] text-[#d7e8ff]/75 leading-relaxed mt-3">
                  {compactText(finding.description)}
                </p>

                {(finding.impact || finding.recommendation) && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {finding.impact && (
                      <div className="border-l-2 border-status-warn/70 pl-3">
                        <p className="font-mono text-[11px] text-status-warn uppercase mb-1">
                          Impact
                        </p>
                        <p className="font-mono text-xs text-[#d7e8ff]/70 leading-relaxed">
                          {compactText(finding.impact, 100)}
                        </p>
                      </div>
                    )}
                    {finding.recommendation && (
                      <div className="border-l-2 border-primary-fixed/50 pl-3">
                        <p className="font-mono text-[11px] text-primary-fixed uppercase mb-1">
                          Next Step
                        </p>
                        <p className="font-mono text-xs text-[#d7e8ff]/70 leading-relaxed">
                          {compactText(finding.recommendation, 100)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
