import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";

export default function BillingPage() {
  return (
    <PageWrapper>
      <Header title="Billing" />
      <EmptyState
        title="No billing records yet"
        description="Time entries, expenses, and invoicing are added in Prompt 6."
      />
    </PageWrapper>
  );
}
