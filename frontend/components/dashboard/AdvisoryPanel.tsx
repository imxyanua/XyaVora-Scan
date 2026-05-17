"use client";

import { useState, useCallback } from "react";
import type { Finding, FindingStatus } from "@/types";
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
    label:      "CRIT_ERR",
    prefix:     "[!!]",
    labelClass: "text-error",
    borderCls:  "border-error",
    statuses:   ["fail"],
  },
  {
    key:        "warn",
    label:      "WARN_LOG",
    prefix:     "[?]",
    labelClass: "text-status-warn",
    borderCls:  "border-status-warn",
    statuses:   ["warning"],
  },
  {
    key:        "info",
    label:      "INFO_LOG",
    prefix:     "[i]",
    labelClass: "text-primary-fixed/50",
    borderCls:  "border-primary-fixed/30",
    statuses:   ["info", "pass"],
  },
];

export function AdvisoryPanel({ findings }: Props) {
  const [activeFinding, setActiveFinding] = useState<Finding | null>(null);
  const closeFinding = useCallback(() => setActiveFinding(null), []);

  const failFindings = findings.filter((f) => f.status === "fail");
  const warnFindings = findings.filter((f) => f.status === "warning");
  const infoFindings = findings.filter((f) => f.status === "info" || f.status === "pass");

  const groupData = [failFindings, warnFindings, infoFindings];
  const totalIssues = failFindings.length + warnFindings.length;

  // Start with CRIT expanded, others collapsed
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ fail: true, warn: false, info: false });
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
    <FindingDrawer finding={activeFinding} onClose={closeFinding} />
    <div className="bg-[#0D0F10] border border-primary-fixed/15 shadow-[3px_3px_0_#050505] flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-primary-fixed/20 flex justify-between items-center bg-[#151918] shrink-0">
        <h2 className="font-mono text-[11px] tracking-widest text-white uppercase">
          SYS.ADVISORY_PANEL
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
                  className="text-primary-fixed/40 text-sm"
                />
              </button>

              {/* Group items */}
              {isExpanded && (
                <div className="border-t border-primary-fixed/10 bg-[#0D0F10] space-y-0">
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
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveFinding(finding)}
                        className="shrink-0 font-mono text-[10px] text-primary-fixed border border-primary-fixed/50 px-1.5 py-0.5 hover:bg-primary-fixed hover:text-[#070B0F] transition-colors"
                      >
                        [FIX]
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
