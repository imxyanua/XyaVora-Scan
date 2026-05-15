import { PhaseLockedPage } from "@/components/layout/PhaseLockedPage";

export default function DashboardPage() {
  return (
    <PhaseLockedPage
      eyebrow="SYS.DASHBOARD"
      title="DASHBOARD"
      icon="space_dashboard"
      description="Dashboard will return with real accounts, saved reports, and personal scan metrics. Phase 1 keeps public scans stateless."
    />
  );
}
