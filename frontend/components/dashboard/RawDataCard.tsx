"use client";

import { useMemo, useState } from "react";
import type { ScanReport } from "@/types";
import { AppIcon } from "@/components/ui/AppIcon";

type Props = {
  report: ScanReport;
};

function makeFileName(hostname: string) {
  const safeHost = hostname.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${safeHost || "scan"}-${stamp}.json`;
}

function redactLargePreview(report: ScanReport) {
  return {
    ...report,
    screenshot: {
      ...report.screenshot,
      base64: report.screenshot.base64 ? "[desktop screenshot base64 omitted from preview]" : undefined,
      mobileBase64: report.screenshot.mobileBase64 ? "[mobile screenshot base64 omitted from preview]" : undefined,
    },
  };
}

export function RawDataCard({ report }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const hostname = report.hostname || report.target;
  const rawJson = useMemo(() => JSON.stringify(report, null, 2), [report]);
  const previewJson = useMemo(() => JSON.stringify(redactLargePreview(report), null, 2), [report]);

  function downloadRawData() {
    const blob = new Blob([rawJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = makeFileName(hostname);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <section className="bg-[#0D0F10] border border-primary-fixed/15 shadow-[3px_3px_0_#050505]">
      <div className="p-3 border-b border-primary-fixed/20 bg-[#151918] flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-mono text-[11px] tracking-widest text-white uppercase">
            SYS.RAW_DATA
          </h3>
          <p className="font-mono text-[10px] text-primary-fixed/45 uppercase tracking-widest mt-1">
            VIEW_OR_DOWNLOAD_SCAN_PAYLOAD
          </p>
        </div>
        <span className="font-mono text-[10px] text-primary-fixed break-all">
          {hostname}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setShowRaw((value) => !value)}
            className="btn-ghost px-3 py-2 text-xs flex items-center justify-center gap-2"
          >
            <AppIcon name="code" className="text-[15px]" />
            {showRaw ? "HIDE_RAW_DATA" : "VIEW_RAW_DATA"}
          </button>
          <button
            type="button"
            onClick={downloadRawData}
            className="btn-primary px-3 py-2 text-xs flex items-center justify-center gap-2"
          >
            <AppIcon name="download" className="text-[15px]" />
            DOWNLOAD_JSON
          </button>
        </div>

        <p className="font-mono text-[10px] text-[#d7e8ff]/55 leading-relaxed">
          RAW preview omits screenshot base64 to keep the page responsive. Download includes the full scan payload.
        </p>

        {showRaw && (
          <pre className="max-h-[420px] overflow-auto bg-[#070B0F] border border-primary-fixed/10 p-3 font-mono text-[10px] leading-relaxed text-[#d7e8ff]/70 whitespace-pre-wrap break-words">
            {previewJson}
          </pre>
        )}
      </div>
    </section>
  );
}
