import { PhaseLockedPage } from "@/components/layout/PhaseLockedPage";

export default function DomainsPage() {
  return (
    <PhaseLockedPage
      eyebrow="SYS.DOMAIN_REGISTRY"
      title="DOMAINS"
      icon="dns"
      description="Domain tracking is intentionally not part of the public scanner. Scan any public domain on demand and keep only browser-local recent reports."
    />
  );
}
