import { listClients } from "@/lib/actions/clients";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";
import { ClientListClient } from "./ClientListClient";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; new?: string }>;
}) {
  const params = await searchParams;
  const clients = await listClients(params.search);

  return (
    <>
      <Header
        title="Clients"
        description="Manage your client records"
      />
      {clients.length === 0 && !params.search ? (
        <ClientListClient clients={[]} showNewModal={params.new === "true"}>
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Add your first client to start managing investigations."
          />
        </ClientListClient>
      ) : (
        <ClientListClient
          clients={clients}
          showNewModal={params.new === "true"}
          initialSearch={params.search}
        />
      )}
    </>
  );
}
