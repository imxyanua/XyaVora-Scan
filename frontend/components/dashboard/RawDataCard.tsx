"use client";

import { useMemo, useState } from "react";
import type { ScanReport } from "@/types";
import { AppIcon } from "@/components/ui/AppIcon";
import { downloadTextFile, generateMarkdownReport, makeReportFileName } from "@/lib/reportExport";

type Props = {
  report: ScanReport;
};

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
  const markdownReport = useMemo(() => generateMarkdownReport(report), [report]);
  const previewJson = useMemo(() => JSON.stringify(redactLargePreview(report), null, 2), [report]);

  function downloadRawData() {
    downloadTextFile(makeReportFileName(hostname, "json"), rawJson, "application/json");
  }

  function downloadMarkdown() {
    downloadTextFile(makeReportFileName(hostname, "md"), markdownReport, "text/markdown");
  }

  return (
    <section className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505]">
      <div className="px-5 pt-5 pb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
            Raw Data
          </h3>
          <p className="font-mono text-xs text-[#d7e8ff]/70 mt-2">
            View or download scan payload
          </p>
        </div>
        <span className="font-mono text-[11px] text-white/70 break-all">
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
            {showRaw ? "Hide raw data" : "View raw data"}
          </button>
          <button
            type="button"
            onClick={downloadRawData}
            className="btn-primary px-3 py-2 text-xs flex items-center justify-center gap-2"
          >
            <AppIcon name="download" className="text-[15px]" />
            Download JSON
          </button>
          <button
            type="button"
            onClick={downloadMarkdown}
            className="btn-primary px-3 py-2 text-xs flex items-center justify-center gap-2"
          >
            <AppIcon name="download" className="text-[15px]" />
            Download Markdown
          </button>
        </div>

        <p className="font-mono text-[10px] text-[#d7e8ff]/55 leading-relaxed">
          RAW preview omits screenshot base64 to keep the page responsive. JSON includes the full scan payload; Markdown is a shareable summary.
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
