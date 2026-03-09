import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";

export default function CasesPage() {
  return (
    <PageWrapper>
      <Header title="Cases" />
      <EmptyState
        title="No cases yet — create one"
        description="Case management UI is scaffolded and ready for Prompt 3."
      />
    </PageWrapper>
  );
}
