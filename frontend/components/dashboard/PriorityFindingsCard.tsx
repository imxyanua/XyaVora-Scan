"use client";

import { useMemo, useState, useCallback } from "react";
import type { Finding, FindingClassification, FindingConfidence, FindingSeverity, FindingSource, FindingStatus } from "@/types";
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

const CLASSIFICATION_WEIGHT: Record<FindingClassification, number> = {
  "verified-issue": 5,
  "observed-risk": 4,
  "hardening-recommendation": 3,
  "investigation-lead": 2,
  informational: 1,
};

const CLASSIFICATION_CLASS: Record<FindingClassification, string> = {
  "verified-issue": "border-error/70 text-error bg-error/5",
  "observed-risk": "border-status-warn/70 text-status-warn bg-status-warn/5",
  "hardening-recommendation": "border-primary-fixed/40 text-primary-fixed bg-primary-fixed/[0.04]",
  "investigation-lead": "border-secondary-fixed/60 text-secondary-fixed bg-secondary-fixed/[0.04]",
  informational: "border-primary-fixed/25 text-primary-fixed/60 bg-primary-fixed/[0.03]",
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

const CLASSIFICATION_LABEL: Record<FindingClassification, string> = {
  "verified-issue": "Verified issue",
  "observed-risk": "Observed risk",
  "hardening-recommendation": "Hardening recommendation",
  "investigation-lead": "Investigation lead",
  informational: "Informational",
};

function rankFinding(finding: Finding) {
  const classificationWeight = finding.classification
    ? CLASSIFICATION_WEIGHT[finding.classification]
    : 0;

  return (
    classificationWeight * 100
    + STATUS_WEIGHT[finding.status] * 10
    + SEVERITY_WEIGHT[finding.severity]
  );
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
  const verifiedCount = findings.filter((finding) => finding.classification === "verified-issue").length;
  const observedCount = findings.filter((finding) => finding.classification === "observed-risk").length;
  const hardeningCount = findings.filter((finding) => finding.classification === "hardening-recommendation").length;

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
              Highest-impact checks that need review. These are posture observations, not exploit claims. Classification and confidence show what was verified versus recommended hardening.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2 shrink-0">
            <span className={`status-badge ${observationCount > 0 ? "status-warn" : "status-pass"} text-[10px]`}>
              {observationCount > 0 ? `[${observationCount} REVIEW]` : "[CLEAR]"}
            </span>
            {verifiedCount > 0 && (
              <span className="status-badge status-fail text-[10px]">
                [{verifiedCount} VERIFIED]
              </span>
            )}
            {observedCount > 0 && (
              <span className="status-badge status-warn text-[10px]">
                [{observedCount} OBSERVED]
              </span>
            )}
            {hardeningCount > 0 && (
              <span className="status-badge text-[10px]">
                [{hardeningCount} HARDEN]
              </span>
            )}
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
                    <div className="flex flex-wrap items-center gap-2 mb-2">
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
                      {finding.classification && (
                        <span className={`font-mono text-[10px] border px-2 py-0.5 ${CLASSIFICATION_CLASS[finding.classification]}`}>
                          {CLASSIFICATION_LABEL[finding.classification]}
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

                {finding.analysis && (
                  <div className="mt-3 border border-primary-fixed/10 bg-[#0d1214] px-3 py-2">
                    <p className="font-mono text-[11px] text-primary-fixed/65 uppercase mb-1">
                      Why flagged
                    </p>
                    <p className="font-mono text-xs text-[#d7e8ff]/70 leading-relaxed">
                      {compactText(finding.analysis, 156)}
                    </p>
                  </div>
                )}

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
