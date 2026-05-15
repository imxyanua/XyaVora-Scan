import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { AppIcon } from "@/components/ui/AppIcon";

type PhaseLockedPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
};

export function PhaseLockedPage({
  eyebrow,
  title,
  description,
  icon,
}: PhaseLockedPageProps) {
  return (
    <AppShell>
      <div className="p-4 md:p-8 w-full max-w-3xl mx-auto">
        <div className="pb-4 border-b border-primary-fixed/15">
          <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest block mb-1">
            &gt; {eyebrow}
          </span>
          <h1 className="font-mono text-xl font-bold text-primary-fixed">{title}</h1>
        </div>

        <div className="card-panel p-8 mt-6 flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <AppIcon name={icon} className="text-4xl text-primary-fixed/40 shrink-0" />
            <div className="min-w-0">
              <p className="font-mono text-sm text-primary-fixed font-bold">
                ACCOUNT_FEATURE_PENDING
              </p>
              <p className="font-mono text-[11px] text-primary-fixed/45 leading-relaxed mt-2">
                {description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/scan" className="btn-primary px-5 py-2 text-xs">
              START SCAN
            </Link>
            <Link href="/support" className="btn-ghost px-5 py-2 text-xs">
              SUPPORT
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
