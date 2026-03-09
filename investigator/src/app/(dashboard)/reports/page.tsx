import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";

export default function ReportsPage() {
  return (
    <PageWrapper>
      <Header title="Reports" />
      <EmptyState
        title="Generate your first AI report"
        description="Report generation and exports are added in Prompt 5."
      />
    </PageWrapper>
  );
}
