import type { ScreenshotResult } from "@/types";

interface Props {
  screenshot: ScreenshotResult;
}

export function ScreenshotCard({ screenshot }: Props) {
  const capturedAt = screenshot.capturedAt
    ? new Date(screenshot.capturedAt).toLocaleTimeString("en-GB")
    : "—";

  return (
    <div className="card-panel flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-primary-fixed/20 bg-[#070B0F] flex justify-between items-center shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase">
          SYS.LIVE_CAPTURE
        </h3>
        <span className="font-mono text-[11px] text-primary-fixed/40">[RENDER]</span>
      </div>

      {/* Preview area */}
      <div className="p-4 flex-1 flex flex-col items-center justify-center">
        {screenshot.base64 ? (
          <>
            <div className="w-full aspect-video border border-primary-fixed/25 bg-primary-fixed/[0.02] relative group overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${screenshot.base64}`}
                alt="Site screenshot"
                className="w-full h-full object-cover"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-[#070B0F]/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button type="button" className="btn-ghost px-4 py-2 text-xs">
                  &gt; VIEW_FULL
                </button>
              </div>
            </div>
            <div className="mt-3 w-full flex justify-between font-mono text-[11px] text-primary-fixed/50">
              <span>&gt; RES: {screenshot.viewport ?? "1920x1080"}</span>
              <span>&gt; TS: {capturedAt}</span>
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col items-center justify-center gap-3 py-6 border border-dashed border-primary-fixed/15">
            <span className="material-symbols-outlined text-3xl text-primary-fixed/20">
              hide_image
            </span>
            <p className="font-mono text-[11px] text-primary-fixed/30 text-center">
              [CAPTURE_DISABLED]
            </p>
            {screenshot.error && (
              <p className="font-mono text-[10px] text-primary-fixed/20 text-center max-w-[220px]">
                {screenshot.error}
              </p>
            )}
            <p className="font-mono text-[10px] text-primary-fixed/20 text-center">
              Set ENABLE_SCREENSHOT=true to activate
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
