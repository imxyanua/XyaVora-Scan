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
        <div className="w-full aspect-video border border-primary-fixed/25 bg-primary-fixed/[0.02] relative group overflow-hidden">
          {screenshot.base64 ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`data:image/png;base64,${screenshot.base64}`}
              alt="Site screenshot"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-primary-fixed/20 text-xl">
                [NO_SIGNAL]
              </span>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-[#070B0F]/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              className="btn-ghost px-4 py-2 text-xs"
            >
              &gt; VIEW_FULL
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-3 w-full flex justify-between font-mono text-[11px] text-primary-fixed/50">
          <span>&gt; RES: {screenshot.viewport ?? "1920x1080"}</span>
          <span>&gt; TS: {capturedAt}</span>
        </div>

        {screenshot.error && (
          <p className="mt-2 font-mono text-[11px] text-primary-fixed/30 text-center">
            {screenshot.error}
          </p>
        )}
      </div>
    </div>
  );
}
