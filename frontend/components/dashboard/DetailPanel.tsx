"use client";

import { useEffect, useState } from "react";

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
  const visibleItems = items.filter((item) => item.value !== undefined && item.value !== null && item.value !== "");

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (visibleItems.length === 0) return null;

  return (
    <>
      <div className="border-t border-primary-fixed/10 bg-[#151918] px-5 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-full items-center justify-between gap-3 border border-primary-fixed/20 bg-[#070B0F] px-3 py-2 font-mono text-xs font-bold text-primary-fixed transition-colors hover:border-primary-fixed/55 hover:bg-primary-fixed/[0.06]"
        >
          <span>{label}</span>
          <span className="text-[10px] text-[#d7e8ff]/55">
            OPEN {visibleItems.length} ITEMS
          </span>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#030506]/75 p-4 backdrop-blur-sm md:items-stretch md:justify-end md:p-0"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />

          <section className="relative flex max-h-[86vh] w-full max-w-3xl flex-col border border-primary-fixed/25 bg-[#101415] shadow-[6px_6px_0_#050505] md:h-full md:max-h-none md:max-w-[560px]">
            <div className="flex items-start justify-between gap-4 border-b border-primary-fixed/15 px-5 py-4">
              <div className="min-w-0">
                <h3 className="break-words font-mono text-xl font-bold leading-tight text-primary-fixed">
                  {label}
                </h3>
                <p className="mt-1 font-mono text-[11px] text-[#d7e8ff]/60">
                  Full scan values and evidence
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
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
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-white">
                    {item.label}
                  </span>
                  <span className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[#d7e8ff]/75">
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
