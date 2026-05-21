"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DetailItem = {
  label: string;
  value?: string | number | boolean | null;
};

type Props = {
  items: DetailItem[];
  label?: string;
};

function formatValue(value: DetailItem["value"]) {
  if (value === undefined || value === null || value === "") return "Unknown";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function DetailPanel({ items, label = "Details" }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const visibleItems = items.filter((item) => item.value !== undefined && item.value !== null && item.value !== "");

  const openPanel = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    setMounted(true);
    window.requestAnimationFrame(() => setOpen(true));
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
    }
    closeTimer.current = window.setTimeout(() => {
      setMounted(false);
      closeTimer.current = null;
    }, 280);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePanel();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closePanel]);

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  if (visibleItems.length === 0) return null;

  return (
    <>
      <div className="mt-auto border-t border-primary-fixed/10 bg-[#151918] px-5 py-2">
        <button
          type="button"
          onClick={openPanel}
          className="inline-flex w-full items-center justify-between gap-3 border border-primary-fixed/20 bg-[#070B0F] px-3 py-2 font-mono text-[13px] font-bold text-primary-fixed transition-colors hover:border-primary-fixed/55 hover:bg-primary-fixed/[0.06]"
        >
          <span>{label}</span>
          <span className="text-[11px] text-[#d7e8ff]/55">
            OPEN {visibleItems.length} ITEMS
          </span>
        </button>
      </div>

      {mounted && (
        <div
          className={`fixed inset-0 z-50 flex items-stretch justify-end bg-[#030506]/75 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none ${
            open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 cursor-default"
            onClick={closePanel}
          />

          <section className={`relative flex h-full w-full max-w-[580px] flex-col border-l border-primary-fixed/25 bg-[#101415] shadow-[-18px_0_44px_rgba(0,0,0,0.38)] transform-gpu transition-transform duration-300 ease-out motion-reduce:transition-none ${
            open ? "translate-x-0" : "translate-x-full"
          }`}>
            <div className="flex items-start justify-between gap-4 border-b border-primary-fixed/15 px-5 py-4">
              <div className="min-w-0">
                <h3 className="break-words font-mono text-xl font-bold leading-tight text-primary-fixed">
                  {label}
                </h3>
                <p className="mt-1 font-mono text-xs text-[#d7e8ff]/60">
                  Full scan values and evidence
                </p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="shrink-0 border border-primary-fixed/25 px-2 py-1 font-mono text-xs text-primary-fixed transition-colors hover:bg-primary-fixed hover:text-[#070B0F]"
              >
                CLOSE
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {visibleItems.map((item) => (
                <div
                  key={`${item.label}:${formatValue(item.value)}`}
                  className="grid gap-2 border-b border-primary-fixed/10 px-5 py-3 last:border-b-0 md:grid-cols-[150px_minmax(0,1fr)]"
                >
                  <span className="font-mono text-xs font-bold uppercase tracking-wide text-white">
                    {item.label}
                  </span>
                  <span className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-[#d7e8ff]/75">
                    {formatValue(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
