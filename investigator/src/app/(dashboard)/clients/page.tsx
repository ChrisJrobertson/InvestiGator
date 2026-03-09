import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";

export default function ClientsPage() {
  return (
    <PageWrapper>
      <Header title="Clients" />
      <EmptyState
        title="No clients yet"
        description="Client CRUD screens are scaffolded for Prompt 3."
      />
    </PageWrapper>
  );
}
