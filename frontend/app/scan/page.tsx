import { AppShell }    from "@/components/layout/AppShell";
import { NewScanForm } from "@/components/scan/NewScanForm";

export default function ScanPage() {
  return (
    <AppShell>
      <div className="p-4 md:p-8 w-full max-w-[1440px] mx-auto">

        {/* Page header */}
        <div className="mb-8 pb-4 border-b border-primary-fixed/15">
          <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest block mb-1">
            &gt; INITIATE_SCAN
          </span>
          <h1 className="font-mono text-xl font-bold text-primary-fixed">
            NEW SCAN
          </h1>
          <p className="font-mono text-[11px] text-primary-fixed/40 mt-1">
            Enter a domain to analyze its security posture.
          </p>
        </div>

        {/* Form */}
        <NewScanForm />

      </div>
    </AppShell>
  );
}
