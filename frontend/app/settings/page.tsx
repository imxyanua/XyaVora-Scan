import { PhaseLockedPage } from "@/components/layout/PhaseLockedPage";

export default function SettingsPage() {
  return (
    <PhaseLockedPage
      eyebrow="SYS.CONFIGURATION"
      title="SETTINGS"
      icon="tune"
      description="Runtime settings will move behind an admin boundary. For phase 1, configure the backend with local environment files."
    />
  );
}
