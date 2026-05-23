import { PhaseLockedPage } from "@/components/layout/PhaseLockedPage";

export default function DashboardPage() {
  return (
    <PhaseLockedPage
      eyebrow="SYS.DASHBOARD"
      title="DASHBOARD"
      icon="space_dashboard"
      description="The public scanner does not require accounts or personal workspaces. Use Scan for a new report or Recent for browser-local reports from this device."
    />
  );
}
