import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient as createClientAction, deleteClient, listClients } from "@/lib/actions/clients";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const params = await searchParams;
  const clients = await listClients({ search: params.q, type: params.type });

  return (
    <PageWrapper>
      <Header title="Clients" />

      <section className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-lg font-semibold">New Client</h2>
        <form action={createClientAction} className="grid gap-3 md:grid-cols-2">
          <Input name="name" placeholder="Client name" required />
          <Input name="contact_name" placeholder="Contact name" />
          <Input name="email" type="email" placeholder="Email" />
          <Input name="phone" placeholder="Phone" />
          <Input name="type" placeholder="Type (e.g. CORPORATE)" defaultValue="CORPORATE" />
          <Input name="address" placeholder="Address" />
          <Input name="notes" placeholder="Notes" className="md:col-span-2" />
          <div className="md:col-span-2">
            <Button type="submit">Create Client</Button>
          </div>
        </form>
      </section>

      <section className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <form className="grid gap-3 md:grid-cols-3">
          <Input name="q" placeholder="Search by client name" defaultValue={params.q ?? ""} />
          <Input
            name="type"
            placeholder="Filter type (e.g. CORPORATE)"
            defaultValue={params.type ?? ""}
          />
          <Button type="submit" variant="ghost">
            Apply filters
          </Button>
        </form>
      </section>

      {!clients.length ? (
        <EmptyState title="No clients yet" description="Create your first client to get started." />
      ) : (
        <ul className="space-y-3">
          {clients.map((client) => (
            <li
              key={client.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--text)]">{client.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {client.type} · {client.email ?? "No email"}
                  </p>
                </div>
                <form action={deleteClient.bind(null, client.id)}>
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
