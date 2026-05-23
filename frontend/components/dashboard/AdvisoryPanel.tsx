"use client";

import { useState, useCallback } from "react";
import type { Finding, FindingClassification, FindingStatus } from "@/types";
import { FindingDrawer } from "./FindingDrawer";
import { AppIcon } from "@/components/ui/AppIcon";

interface Props {
  findings: Finding[];
}

interface Group {
  key:        string;
  label:      string;
  prefix:     string;
  labelClass: string;
  borderCls:  string;
  statuses:   FindingStatus[];
}

const GROUPS: Group[] = [
  {
    key:        "fail",
    label:      "Needs Attention",
    prefix:     "[!!]",
    labelClass: "text-error",
    borderCls:  "border-error",
    statuses:   ["fail"],
  },
  {
    key:        "warn",
    label:      "Review",
    prefix:     "[?]",
    labelClass: "text-status-warn",
    borderCls:  "border-status-warn",
    statuses:   ["warning"],
  },
  {
    key:        "info",
    label:      "Info",
    prefix:     "[i]",
    labelClass: "text-primary-fixed/65",
    borderCls:  "border-primary-fixed/30",
    statuses:   ["info", "pass"],
  },
];

const CLASSIFICATION_LABEL: Record<FindingClassification, string> = {
  "verified-issue": "Verified",
  "observed-risk": "Observed",
  "hardening-recommendation": "Hardening",
  "investigation-lead": "Investigate",
  informational: "Info",
};

const CLASSIFICATION_CLASS: Record<FindingClassification, string> = {
  "verified-issue": "text-error border-error/60",
  "observed-risk": "text-status-warn border-status-warn/60",
  "hardening-recommendation": "text-primary-fixed border-primary-fixed/35",
  "investigation-lead": "text-secondary-fixed border-secondary-fixed/60",
  informational: "text-primary-fixed/55 border-primary-fixed/25",
};

export function AdvisoryPanel({ findings }: Props) {
  const [activeFinding, setActiveFinding] = useState<Finding | null>(null);
  const closeFinding = useCallback(() => setActiveFinding(null), []);

  const failFindings = findings.filter((f) => f.status === "fail");
  const warnFindings = findings.filter((f) => f.status === "warning");
  const infoFindings = findings.filter((f) => f.status === "info" || f.status === "pass");

  const groupData = [failFindings, warnFindings, infoFindings];
  const totalIssues = failFindings.length + warnFindings.length;

  // Start with attention items expanded, others collapsed
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ fail: true, warn: false, info: false });
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
    <FindingDrawer finding={activeFinding} onClose={closeFinding} />
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h2 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Findings
        </h2>
        <span className={`status-badge ${totalIssues > 0 ? "status-warn" : "status-pass"} text-[10px]`}>
          [QTY:{totalIssues}]
        </span>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {GROUPS.map((group, gi) => {
          const items = groupData[gi];
          if (items.length === 0) return null;

          const isExpanded = expanded[group.key] ?? false;

          return (
            <div key={group.key} className="border border-primary-fixed/15 bg-[#101415]">
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggle(group.key)}
                  className="w-full flex justify-between items-center p-2 px-3 hover:bg-primary-fixed/[0.05] transition-colors"
              >
                <span className={`font-mono text-sm font-bold ${group.labelClass}`}>
                  {group.prefix} {group.label} ({items.length})
                </span>
                <AppIcon
                  name={isExpanded ? "expand_more" : "chevron_right"}
                  className="text-primary-fixed/60 text-sm"
                />
              </button>

              {/* Group items */}
              {isExpanded && (
                <div className="border-t border-primary-fixed/10 bg-[#151918] space-y-0">
                  {items.map((finding, i) => (
                    <div
                      key={finding.id}
                      className={`flex justify-between items-start px-3 py-2 ${group.borderCls} border-l-2 ${
                        i > 0 ? "border-t border-primary-fixed/10" : ""
                      }`}
                    >
                      <div className="min-w-0 mr-2">
                        <span className="font-mono text-sm text-white block truncate">
                          {finding.title}
                        </span>
                        <span className="font-mono text-[11px] text-[#d7e8ff]/55 block mt-0.5">
                          &gt; {finding.category}
                        </span>
                        {finding.classification && (
                          <span className={`inline-block font-mono text-[10px] border px-1.5 py-0.5 mt-1 ${CLASSIFICATION_CLASS[finding.classification]}`}>
                            {CLASSIFICATION_LABEL[finding.classification]}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveFinding(finding)}
                        className="shrink-0 font-mono text-[10px] text-primary-fixed border border-primary-fixed/50 px-1.5 py-0.5 hover:bg-primary-fixed hover:text-[#070B0F] transition-colors"
                      >
                        DETAILS
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
