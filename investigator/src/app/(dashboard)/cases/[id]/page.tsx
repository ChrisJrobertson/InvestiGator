import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageWrapper>
      <Header title={`Case ${id}`} />
      <p className="text-sm text-[var(--text-muted)]">
        Case detail sections for findings, reports, and billing land in Prompts 3–6.
      </p>
    </PageWrapper>
  );
}
