"use client";

import { useState } from "react";
import type { ScreenshotResult } from "@/types";
import { AppIcon } from "@/components/ui/AppIcon";

interface Props {
  screenshot: ScreenshotResult;
}

type ViewMode = "desktop" | "mobile";

export function ScreenshotCard({ screenshot }: Props) {
  const [view, setView]           = useState<ViewMode>("desktop");
  const [lightboxOpen, setLightbox] = useState(false);

  const capturedAt = screenshot.capturedAt
    ? new Date(screenshot.capturedAt).toLocaleTimeString("en-GB")
    : "—";

  const hasMobile  = Boolean(screenshot.mobileBase64);
  const isDisabled = screenshot.error?.toLowerCase().includes("disabled") ?? false;
  const isTimedOut = screenshot.error?.toLowerCase().includes("timed out") ?? false;
  const imgSrc     = view === "mobile" && hasMobile
    ? `data:image/png;base64,${screenshot.mobileBase64}`
    : screenshot.base64
      ? `data:image/png;base64,${screenshot.base64}`
      : null;
  const viewportLabel = view === "mobile"
    ? (screenshot.mobileViewport ?? "390x844")
    : (screenshot.viewport ?? "1280x720");

  return (
    <>
      <div className="card-panel flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-primary-fixed/20 bg-[#070B0F] flex justify-between items-center shrink-0">
          <h3 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase">
            SYS.LIVE_CAPTURE
          </h3>
          <div className="flex items-center gap-3">
            {/* Viewport toggle — only shown when both captures exist */}
            {imgSrc && hasMobile && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setView("desktop")}
                  className={`font-mono text-[10px] px-2 py-0.5 border transition-colors ${
                    view === "desktop"
                      ? "border-primary-fixed/50 text-primary-fixed/80 bg-primary-fixed/10"
                      : "border-primary-fixed/20 text-primary-fixed/30 hover:text-primary-fixed/50"
                  }`}
                >
                  DESK
                </button>
                <button
                  type="button"
                  onClick={() => setView("mobile")}
                  className={`font-mono text-[10px] px-2 py-0.5 border transition-colors ${
                    view === "mobile"
                      ? "border-primary-fixed/50 text-primary-fixed/80 bg-primary-fixed/10"
                      : "border-primary-fixed/20 text-primary-fixed/30 hover:text-primary-fixed/50"
                  }`}
                >
                  MOB
                </button>
              </div>
            )}
            <span className="font-mono text-[11px] text-primary-fixed/40">[RENDER]</span>
          </div>
        </div>

        {/* Preview area */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center">
          {imgSrc ? (
            <>
              <div className={`border border-primary-fixed/25 bg-primary-fixed/[0.02] relative group overflow-hidden transition-all duration-200 ${
                view === "mobile" ? "w-[55%] aspect-[390/844] mx-auto" : "w-full aspect-video"
              }`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc}
                  alt={`Site screenshot (${view})`}
                  className="w-full h-full object-cover object-top"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-[#070B0F]/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    type="button"
                    className="btn-ghost px-4 py-2 text-xs"
                    onClick={() => setLightbox(true)}
                  >
                    &gt; VIEW_FULL
                  </button>
                </div>
              </div>
              <div className="mt-3 w-full flex justify-between font-mono text-[11px] text-primary-fixed/50">
                <span>&gt; RES: {viewportLabel}</span>
                <span>&gt; TS: {capturedAt}</span>
              </div>
            </>
          ) : (
            <div className="w-full flex flex-col items-center justify-center gap-3 py-6 border border-dashed border-primary-fixed/15">
              <AppIcon name="hide_image" className="text-3xl text-primary-fixed/20" />
              <p className="font-mono text-[11px] text-primary-fixed/30 text-center">
                {isDisabled ? "[CAPTURE_DISABLED]" : "[CAPTURE_ERROR]"}
              </p>
              {screenshot.error && (
                <p className="font-mono text-[10px] text-primary-fixed/20 text-center max-w-[220px]">
                  {screenshot.error}
                </p>
              )}
              {isDisabled ? (
                <p className="font-mono text-[10px] text-primary-fixed/20 text-center">
                  Set ENABLE_SCREENSHOT=true to activate
                </p>
              ) : isTimedOut ? (
                <p className="font-mono text-[10px] text-primary-fixed/20 text-center">
                  Increase SCREENSHOT_TIMEOUT_SECONDS and rescan.
                </p>
              ) : (
                <p className="font-mono text-[10px] text-primary-fixed/20 text-center">
                  Verify Playwright is installed in the backend runtime.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && imgSrc && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          {/* Top bar */}
          <div
            className="w-full max-w-5xl flex justify-between items-center px-4 py-2 mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-mono text-[11px] text-primary-fixed/50">
              {screenshot.url ?? ""}&nbsp;|&nbsp;{viewportLabel}&nbsp;|&nbsp;{capturedAt}
            </span>
            <button
              type="button"
              className="font-mono text-[11px] text-primary-fixed/50 hover:text-primary-fixed transition-colors"
              onClick={() => setLightbox(false)}
            >
              [CLOSE ✕]
            </button>
          </div>

          {/* Image — constrained width for mobile so it doesn't stretch */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={`Site screenshot full (${view})`}
            className={`border border-primary-fixed/20 shadow-2xl ${
              view === "mobile" ? "max-h-[85vh] w-auto" : "max-w-5xl w-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
