import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { CaseCard } from "@/components/cases/CaseCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Briefcase } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function CasesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user!.id)
    .single();

  const { data: cases } = await supabase
    .from("cases")
    .select("id, ref, title, status, priority, created_at, clients(name)")
    .eq("organisation_id", profile!.organisation_id)
    .order("created_at", { ascending: false });

  return (
    <>
      <Header
        title="Cases"
        description="Manage your investigation cases"
        actions={
          <Link href="/cases?new=true">
            <Button>New Case</Button>
          </Link>
        }
      />

      {(cases ?? []).length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No cases yet"
          description="Create your first investigation case to get started."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(cases ?? []).map((c) => (
            <CaseCard
              key={c.id}
              id={c.id}
              ref={c.ref}
              title={c.title}
              status={c.status}
              priority={c.priority}
              clientName={(c.clients as unknown as { name: string })?.name}
              createdAt={c.created_at}
            />
          ))}
        </div>
      )}
    </>
  );
}
