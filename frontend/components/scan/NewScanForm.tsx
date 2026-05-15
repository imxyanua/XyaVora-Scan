"use client";

import { useState, type FormEvent } from "react";
import { startScan } from "@/lib/startScan";

const QUICK_TARGETS = ["google.com", "github.com", "cloudflare.com", "mozilla.org"];

export function NewScanForm() {
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const domain = target.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain) {
      setError("ERR: TARGET_EMPTY — enter a domain to scan");
      return;
    }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      setError("ERR: INVALID_TARGET — expected format: example.com");
      return;
    }
    startScan(domain);
  }

  function handleQuick(domain: string) {
    setTarget(domain);
    setError("");
    startScan(domain);
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#0F1720] panel-border p-1 flex flex-col sm:flex-row gap-2 focus-within:cyber-glow transition-all duration-300"
      >
        <div className="flex-grow flex items-center bg-[#070B0F] border border-[#223042] px-4 py-3 terminal-input">
          <input
            type="text"
            value={target}
            onChange={(e) => { setTarget(e.target.value); setError(""); }}
            className="w-full bg-transparent border-none text-primary-fixed font-mono text-sm focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/50 caret-primary-fixed"
            placeholder="example.com"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="btn-primary px-8 py-3 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">travel_explore</span>
          ANALYZE
        </button>
      </form>

      {/* Validation error */}
      {error && (
        <p className="font-mono text-[11px] text-red-400/80 pl-1">{error}</p>
      )}

      {/* Quick targets */}
      <div>
        <p className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest mb-2">
          &gt; QUICK_TARGETS:
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_TARGETS.map((domain) => (
            <button
              key={domain}
              type="button"
              onClick={() => handleQuick(domain)}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              {domain}
            </button>
          ))}
        </div>
      </div>

      {/* Info block */}
      <div className="card-panel p-4 space-y-2">
        <p className="font-mono text-[10px] text-primary-fixed/40 uppercase tracking-widest">
          &gt; SCAN_SCOPE:
        </p>
        <ul className="space-y-1.5">
          {[
            "DNS records — A, AAAA, MX, NS, TXT, SPF, DMARC",
            "SSL certificate — issuer, expiry, TLS version",
            "HTTP security headers — HSTS, CSP, X-Frame-Options",
            "WHOIS — registrar, creation date, expiry",
            "Tech stack detection — frameworks, CDN, analytics",
            "Cookie flags — Secure, HttpOnly, SameSite",
            "Security.txt presence check",
            "Live screenshot capture",
            "Risk score — grade A-F",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 font-mono text-[11px] text-primary-fixed/60">
              <span className="text-primary-fixed/30 shrink-0">+</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
