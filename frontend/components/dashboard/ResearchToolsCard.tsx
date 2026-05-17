"use client";

import { useMemo, useState } from "react";
import type { ScanReport } from "@/types";
import { AppIcon } from "@/components/ui/AppIcon";

type Props = {
  report: ScanReport;
};

type ToolLink = {
  label: string;
  detail: string;
  href: string;
  icon: string;
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

export function ResearchToolsCard({ report }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const hostname = report.hostname || report.target;
  const encodedHost = encodeURIComponent(hostname);
  const encodedUrl = encodeURIComponent(report.normalizedUrl || `https://${hostname}`);

  const tools: ToolLink[] = [
    {
      label: "SSL Labs",
      detail: "TLS certificate and protocol test",
      href: `https://www.ssllabs.com/ssltest/analyze.html?d=${encodedHost}`,
      icon: "lock",
    },
    {
      label: "SecurityHeaders",
      detail: "HTTP security header validation",
      href: `https://securityheaders.com/?q=${encodedHost}&followRedirects=on`,
      icon: "security",
    },
    {
      label: "crt.sh",
      detail: "Certificate transparency lookup",
      href: `https://crt.sh/?q=${encodedHost}`,
      icon: "dns",
    },
    {
      label: "PageSpeed",
      detail: "Performance and UX diagnostics",
      href: `https://pagespeed.web.dev/analysis?url=${encodedUrl}`,
      icon: "monitoring",
    },
    {
      label: "urlscan.io",
      detail: "Public URL intelligence search",
      href: `https://urlscan.io/search/#${encodedHost}`,
      icon: "travel_explore",
    },
  ];

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
    <section className="card-panel">
      <div className="p-3 border-b border-primary-fixed/20 bg-[#070B0F] flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase">
            SYS.EXTERNAL_TOOLS_FOR_FURTHER_RESEARCH
          </h3>
          <p className="font-mono text-[10px] text-primary-fixed/35 uppercase tracking-widest mt-1">
            VIEW_OR_DOWNLOAD_RAW_DATA
          </p>
        </div>
        <span className="font-mono text-[10px] text-primary-fixed/40 break-all">
          {hostname}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-primary-fixed/10">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {tools.map((tool) => (
              <a
                key={tool.label}
                href={tool.href}
                target="_blank"
                rel="noreferrer"
                className="group min-h-[76px] border-b border-primary-fixed/10 last:border-b-0 sm:odd:border-r sm:last:border-b sm:border-primary-fixed/10 px-4 py-3 flex items-center gap-3 hover:bg-primary-fixed/[0.04] transition-colors"
              >
                <AppIcon
                  name={tool.icon}
                  className="text-[20px] text-primary-fixed/70 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block font-mono text-[12px] text-primary-fixed uppercase tracking-wider">
                    {tool.label}
                  </span>
                  <span className="block font-mono text-[10px] text-primary-fixed/45 mt-1">
                    {tool.detail}
                  </span>
                </span>
                <AppIcon
                  name="chevron_right"
                  className="ml-auto text-[16px] text-primary-fixed/30 group-hover:text-primary-fixed shrink-0"
                />
              </a>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2">
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

          <p className="font-mono text-[10px] text-primary-fixed/40 leading-relaxed">
            RAW preview omits screenshot base64 to keep the page responsive. Download includes the full scan payload.
          </p>

          {showRaw && (
            <pre className="max-h-[360px] overflow-auto bg-[#070B0F] border border-primary-fixed/10 p-3 font-mono text-[10px] leading-relaxed text-primary-fixed/60 whitespace-pre-wrap break-words">
              {previewJson}
            </pre>
          )}
        </div>
      </div>
    </section>
  );
}
