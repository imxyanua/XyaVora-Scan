import { PhaseLockedPage } from "@/components/layout/PhaseLockedPage";

export default function DomainsPage() {
  return (
    <PhaseLockedPage
      eyebrow="SYS.DOMAIN_REGISTRY"
      title="DOMAINS"
      icon="dns"
      description="Domain tracking depends on saved scan history. It is reserved for the account phase so the public scanner stays clean."
    />
  );
}
