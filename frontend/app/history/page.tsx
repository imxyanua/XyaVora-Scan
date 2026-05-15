import { PhaseLockedPage } from "@/components/layout/PhaseLockedPage";

export default function HistoryPage() {
  return (
    <PhaseLockedPage
      eyebrow="SCAN_HISTORY"
      title="HISTORY"
      icon="history"
      description="Guest scans are shown immediately after completion but are not stored. History will be enabled after account-based storage is added."
    />
  );
}
