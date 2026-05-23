import type { ReactNode } from "react";

export function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonSection title="Overview" detail="risk score and primary signals">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.65fr)]">
          <SkeletonCard height="h-64" />
          <SkeletonCard height="h-64" />
        </div>
        <SkeletonCard height="h-44" />
      </SkeletonSection>

      <SkeletonSection title="Security Posture" detail="headers, tls, cookies, disclosure">
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard height="h-72" />
          <SkeletonCard height="h-72" />
          <SkeletonCard height="h-64" />
          <SkeletonCard height="h-64" />
        </div>
      </SkeletonSection>

      <SkeletonSection title="Network And Discovery" detail="dns, ownership, crawler hints">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard height="h-72" />
          <SkeletonCard height="h-72" />
          <SkeletonCard height="h-72" />
        </div>
      </SkeletonSection>
    </div>
  );
}

function SkeletonSection({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4 border-b border-primary-fixed/15 pb-2">
        <h2 className="font-mono text-[13px] text-white uppercase tracking-widest">
          {title}
        </h2>
        <span className="font-mono text-[10px] text-primary-fixed/60 uppercase tracking-widest text-right">
          {detail}
        </span>
      </div>
      {children}
    </section>
  );
}

function SkeletonCard({ height }: { height: string }) {
  return (
    <div className={`${height} card-panel relative overflow-hidden`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-primary-fixed/5 to-transparent" />
      <div className="h-10 bg-[#070B0F] border-b border-primary-fixed/10 flex items-center justify-between px-4">
        <div className="h-2 w-32 bg-primary-fixed/15" />
        <div className="h-2 w-12 bg-primary-fixed/10" />
      </div>
      <div className="p-4 space-y-3">
        <div className="h-3 w-3/4 bg-primary-fixed/10" />
        <div className="h-3 w-1/2 bg-primary-fixed/10" />
        <div className="h-3 w-2/3 bg-primary-fixed/10" />
      </div>
    </div>
  );
}
