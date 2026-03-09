import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCase, deleteCase, listCases } from "@/lib/actions/cases";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; client_id?: string }>;
}) {
  const params = await searchParams;
  const [cases, supabase] = await Promise.all([
    listCases({
      status: params.status,
      type: params.type,
      clientId: params.client_id,
    }),
    createClient(),
  ]);

  const [{ data: clients }, { data: investigators }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name")
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);
  const clientOptions = (clients ?? []) as Array<{ id: string; name: string }>;
  const investigatorOptions = (investigators ?? []) as Array<{ id: string; name: string }>;

  return (
    <PageWrapper>
      <Header title="Cases" />

      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-lg font-semibold">New Case</h2>
        <form action={createCase} className="grid gap-3 md:grid-cols-2">
          <Input name="title" placeholder="Case title" required />
          <Input name="type" placeholder="Type (e.g. OSINT)" defaultValue="OTHER" />
          <select
            name="client_id"
            className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            defaultValue=""
          >
            <option value="">Select client</option>
            {clientOptions.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <select
            name="investigator_id"
            className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            defaultValue=""
          >
            <option value="">Assign investigator</option>
            {investigatorOptions.map((investigator) => (
              <option key={investigator.id} value={investigator.id}>
                {investigator.name}
              </option>
            ))}
          </select>
          <Input name="rate" type="number" placeholder="Rate (pence/hour)" defaultValue="500" />
          <Input name="priority" placeholder="Priority (LOW|MEDIUM|HIGH|URGENT)" defaultValue="MEDIUM" />
          <Input name="due_date" type="date" />
          <Input name="description" placeholder="Description" className="md:col-span-2" />
          <div className="md:col-span-2">
            <Button type="submit">Create Case</Button>
          </div>
        </form>
      </section>

      <section className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <form className="grid gap-3 md:grid-cols-4">
          <Input name="status" placeholder="Status (OPEN/ACTIVE/...)" defaultValue={params.status ?? ""} />
          <Input name="type" placeholder="Type" defaultValue={params.type ?? ""} />
          <Input name="client_id" placeholder="Client ID" defaultValue={params.client_id ?? ""} />
          <Button type="submit" variant="ghost">
            Apply filters
          </Button>
        </form>
      </section>

      {!cases.length ? (
        <EmptyState title="No cases yet — create one" description="Create your first case." />
      ) : (
        <ul className="space-y-3">
          {cases.map((currentCase) => (
            <li
              key={currentCase.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/cases/${currentCase.id}`} className="mono text-xs text-[var(--accent)]">
                    {currentCase.ref}
                  </Link>
                  <p className="text-sm font-medium">{currentCase.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {currentCase.status} · {currentCase.type}
                  </p>
                </div>
                <form action={deleteCase.bind(null, currentCase.id)}>
                  <Button variant="danger" type="submit">
                    Delete
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageWrapper>
  );
}
