import { PhaseLockedPage } from "@/components/layout/PhaseLockedPage";

export default function LogsPage() {
  return (
    <PhaseLockedPage
      eyebrow="SYS.SCAN_LOG"
      title="LOGS"
      icon="terminal"
      description="Runtime logs are an admin/development surface. They are hidden from the public scanner flow until admin access exists."
    />
  );
}
