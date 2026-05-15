"use client";

import { useState, type FormEvent } from "react";
import { startScan } from "@/lib/startScan";
import { AppIcon } from "@/components/ui/AppIcon";

export function ScanInput() {
  const [target, setTarget] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const domain = target.trim();
    if (!domain) return;
    startScan(domain);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#0F1720] panel-border p-1 flex flex-col sm:flex-row gap-2 focus-within:cyber-glow transition-all duration-300"
    >
      <div className="flex-grow flex items-center bg-[#070B0F] border border-[#223042] px-4 py-3 terminal-input">
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full bg-transparent border-none text-primary-fixed font-mono text-sm focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/50 caret-primary-fixed"
          placeholder="example.com"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>
      <button
        type="submit"
        className="btn-primary px-8 py-3 flex items-center justify-center gap-2 whitespace-nowrap"
      >
        <AppIcon name="travel_explore" className="text-[18px]" />
        ANALYZE DOMAIN
      </button>
    </form>
  );
}
