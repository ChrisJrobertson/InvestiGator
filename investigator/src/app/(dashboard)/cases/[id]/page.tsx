import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { getCase } from "@/lib/actions/cases";
import { formatCurrencyFromPence } from "@/lib/utils";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentCase = await getCase(id);

  return (
    <PageWrapper>
      <Header title={`${currentCase.ref} · ${currentCase.title}`} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge>{currentCase.status}</Badge>
        <Badge>{currentCase.type}</Badge>
        <Badge>Priority: {currentCase.priority}</Badge>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-muted)]">Findings</p>
          <p className="mt-1 text-xl font-semibold">{currentCase.findingsCount}</p>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-muted)]">Time total</p>
          <p className="mt-1 text-xl font-semibold">
            {formatCurrencyFromPence(currentCase.timeTotalPence)}
          </p>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-muted)]">Expense total</p>
          <p className="mt-1 text-xl font-semibold">
            {formatCurrencyFromPence(currentCase.expenseTotalPence)}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-2 text-lg font-semibold">Description</h2>
        <p className="text-sm text-[var(--text-muted)]">
          {currentCase.description || "No description provided."}
        </p>
      </section>
    </PageWrapper>
  );
}
