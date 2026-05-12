import { AppShell } from "@/components/layout/AppShell";

// Shown by Next.js while the server component fetches scan data from the backend.
// Gives the user visual feedback instead of a blank white screen.
export default function ReportLoading() {
  return (
    <AppShell>
      <div className="p-4 md:p-6 w-full max-w-[1440px] mx-auto">

        {/* Status header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="font-mono text-[11px] text-primary-fixed/50 uppercase tracking-widest animate-pulse">
            &gt; LOADING_SCAN_RESULTS...
          </span>
        </div>

        {/* Row 1 skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
          <div className="lg:col-span-4">
            <Skeleton height="h-64" />
          </div>
          <div className="lg:col-span-8">
            <Skeleton height="h-64" />
          </div>
        </div>

        {/* Row 2 skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
          <div className="md:col-span-5 lg:col-span-4">
            <Skeleton height="h-80" />
          </div>
          <div className="md:col-span-7 lg:col-span-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton height="h-36" />
            <Skeleton height="h-36" />
            <div className="lg:col-span-2">
              <Skeleton height="h-36" />
            </div>
          </div>
        </div>

        {/* Row 3 skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Skeleton height="h-64" />
          </div>
          <Skeleton height="h-64" />
        </div>

      </div>
    </AppShell>
  );
}

function Skeleton({ height }: { height: string }) {
  return (
    <div
      className={`${height} card-panel relative overflow-hidden`}
      aria-hidden="true"
    >
      {/* Shimmer sweep */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-primary-fixed/5 to-transparent" />
      {/* Fake header bar */}
      <div className="h-9 bg-[#070B0F] border-b border-primary-fixed/10 flex items-center px-3">
        <div className="h-2 w-32 bg-primary-fixed/10 rounded-none" />
      </div>
    </div>
  );
}
