import { listCases } from "@/lib/actions/cases";
import { listClients } from "@/lib/actions/clients";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Briefcase } from "lucide-react";
import { CaseListClient } from "./CaseListClient";
import { createClient } from "@/lib/supabase/server";

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    client_id?: string;
    search?: string;
    new?: string;
  }>;
}) {
  const params = await searchParams;

  const [cases, clients, supabase] = await Promise.all([
    listCases({
      status: params.status,
      priority: params.priority,
      client_id: params.client_id,
      search: params.search,
    }),
    listClients(),
    createClient(),
  ]);

  const { data: investigators } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("is_active", true)
    .order("name");

  const hasFilters = !!(params.status || params.priority || params.client_id || params.search);

  return (
    <>
      <Header title="Cases" description="Manage your investigation cases" />
      {cases.length === 0 && !hasFilters ? (
        <CaseListClient
          cases={[]}
          clients={clients}
          investigators={investigators ?? []}
          showNewModal={params.new === "true"}
        >
          <EmptyState
            icon={Briefcase}
            title="No cases yet"
            description="Create your first investigation case to get started."
          />
        </CaseListClient>
      ) : (
        <CaseListClient
          cases={cases}
          clients={clients}
          investigators={investigators ?? []}
          showNewModal={params.new === "true"}
          initialFilters={params}
        />
      )}
    </>
  );
}
