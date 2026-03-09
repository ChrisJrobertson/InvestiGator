import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { ClientCard } from "@/components/clients/ClientCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user!.id)
    .single();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, contact_person")
    .eq("organisation_id", profile!.organisation_id)
    .order("name");

  return (
    <>
      <Header
        title="Clients"
        description="Manage your client records"
        actions={
          <Link href="/clients?new=true">
            <Button>Add Client</Button>
          </Link>
        }
      />

      {(clients ?? []).length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first client to start managing investigations."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(clients ?? []).map((c) => (
            <ClientCard
              key={c.id}
              id={c.id}
              name={c.name}
              email={c.email ?? undefined}
              contactPerson={c.contact_person ?? undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}
