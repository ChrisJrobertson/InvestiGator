import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default function SettingsPage() {
  return (
    <PageWrapper>
      <Header title="Settings" />
      <p className="text-sm text-[var(--text-muted)]">
        Organisation settings and Stripe billing controls are wired in Prompt 7.
      </p>
    </PageWrapper>
  );
}
