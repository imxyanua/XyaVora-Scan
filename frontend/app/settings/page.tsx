"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import type { BackendSettings } from "@/types";

const READ_ONLY_KEYS: (keyof BackendSettings)[] = ["CORS_ORIGIN", "ENV", "MAX_HTML_BYTES"];

const LABELS: Record<keyof BackendSettings, { label: string; desc: string }> = {
  ENABLE_SCREENSHOT:           { label: "Enable Screenshot",          desc: "Capture live Playwright screenshots during scans. Requires Chromium installed on the backend." },
  SCAN_TIMEOUT_SECONDS:        { label: "Scan Timeout (s)",           desc: "Maximum total time for a full scan pipeline before aborting." },
  ANALYZER_TIMEOUT_SECONDS:    { label: "Analyzer Timeout (s)",       desc: "Per-analyzer timeout. Any single module exceeding this is skipped with an error." },
  SCREENSHOT_TIMEOUT_SECONDS:  { label: "Screenshot Timeout (s)",     desc: "Separate timeout for the screenshot capture, typically longer than the default analyzer timeout." },
  FETCH_TIMEOUT_SECONDS:       { label: "Fetch Timeout (s)",          desc: "HTTP request timeout used when fetching pages for header / tech stack analysis." },
  MAX_HTML_BYTES:              { label: "Max HTML Size (bytes)",      desc: "Maximum HTML response size processed by the tech stack analyzer." },
  CORS_ORIGIN:                 { label: "CORS Origin",                desc: "Allowed origin for CORS — set in .env, read-only at runtime." },
  ENV:                         { label: "Environment",                desc: "Current runtime environment (development / production)." },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<BackendSettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((b) => { if (b.success) setSettings(b.data); else setError(b.error); })
      .catch(() => setError("Backend unreachable"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleBool(key: keyof BackendSettings) {
    if (!settings) return;
    setSaving(key);
    const newVal = !settings[key];
    try {
      const res  = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newVal }),
      });
      const body = await res.json();
      if (body.success) setSettings(body.data);
      else setError(body.error ?? "Failed to save");
    } catch {
      setError("Backend unreachable");
    } finally {
      setSaving(null);
    }
  }

  const configurableKeys: (keyof BackendSettings)[] = [
    "ENABLE_SCREENSHOT", "SCAN_TIMEOUT_SECONDS", "ANALYZER_TIMEOUT_SECONDS",
    "SCREENSHOT_TIMEOUT_SECONDS", "FETCH_TIMEOUT_SECONDS",
  ];

  return (
    <AppShell>
      <div className="p-4 md:p-8 w-full max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="pb-4 border-b border-primary-fixed/15">
          <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest block mb-1">
            &gt; SYS.CONFIGURATION
          </span>
          <h1 className="font-mono text-xl font-bold text-primary-fixed">SETTINGS</h1>
          <p className="font-mono text-[11px] text-primary-fixed/40 mt-1">
            Runtime overrides — reset when the backend restarts. Edit .env for permanent changes.
          </p>
        </div>

        {loading && (
          <p className="font-mono text-[11px] text-primary-fixed/40 animate-pulse">&gt; LOADING...</p>
        )}
        {error && <p className="font-mono text-sm text-error">[-] {error}</p>}

        {settings && (
          <>
            {/* Configurable settings */}
            <section>
              <h2 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase border-b border-primary-fixed/20 pb-2 mb-4">
                SYS.RUNTIME_OVERRIDES
              </h2>
              <div className="space-y-3">
                {configurableKeys.map((key) => {
                  const val  = settings[key];
                  const meta = LABELS[key];
                  const isBool = typeof val === "boolean";
                  const isSaving = saving === key;

                  return (
                    <div key={key} className="card-panel p-4 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm text-primary-fixed font-bold">{meta.label}</p>
                        <p className="font-mono text-[10px] text-primary-fixed/40 mt-0.5 leading-relaxed">{meta.desc}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {isBool ? (
                          <button
                            type="button"
                            onClick={() => toggleBool(key)}
                            disabled={isSaving}
                            className={`relative w-12 h-6 border transition-colors ${
                              val
                                ? "bg-primary-fixed/20 border-primary-fixed"
                                : "bg-transparent border-primary-fixed/30"
                            } ${isSaving ? "opacity-50" : ""}`}
                          >
                            <span
                              className={`absolute top-0.5 h-5 w-5 bg-primary-fixed transition-all duration-200 ${
                                val ? "left-[calc(100%-1.375rem)]" : "left-0.5"
                              }`}
                            />
                          </button>
                        ) : (
                          <span className="font-mono text-sm text-secondary-fixed font-bold">{String(val)}</span>
                        )}
                        {isBool && (
                          <span className={`font-mono text-[10px] ${val ? "text-status-pass" : "text-primary-fixed/40"}`}>
                            {val ? "ON" : "OFF"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Read-only info */}
            <section>
              <h2 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase border-b border-primary-fixed/20 pb-2 mb-4">
                SYS.ENV_INFO
              </h2>
              <div className="space-y-2">
                {READ_ONLY_KEYS.map((key) => (
                  <div key={key} className="flex justify-between items-center px-4 py-2.5 border border-primary-fixed/10">
                    <span className="font-mono text-[11px] text-primary-fixed/50">{LABELS[key].label}</span>
                    <span className="font-mono text-[11px] text-primary-fixed/70 text-right truncate max-w-[60%]">
                      {String(settings[key])}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

      </div>
    </AppShell>
  );
}
