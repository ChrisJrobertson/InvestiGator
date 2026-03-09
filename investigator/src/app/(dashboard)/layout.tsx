import { AuthGuard } from "@/components/layout/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { PLAN_LIMITS, type PlanName } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { ReactNode } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("id, name, email, organisation_id")
        .eq("id", user.id)
        .single()
    : { data: null };

  const { data: organisation } = profile
    ? await supabase
        .from("organisations")
        .select("plan, ai_credits_used")
        .eq("id", profile.organisation_id)
        .single()
    : { data: null };

  const plan = (organisation?.plan as PlanName | undefined) ?? "SOLO";
  const aiLimit = PLAN_LIMITS[plan].aiCredits;
  const aiUsed = organisation?.ai_credits_used ?? 0;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[var(--bg)]">
        <Sidebar
          userName={profile?.name ?? "Investigator"}
          userEmail={profile?.email ?? user?.email ?? ""}
          aiUsed={aiUsed}
          aiLimit={aiLimit}
        />
        <main className="md:ml-[220px]">{children}</main>
      </div>
    </AuthGuard>
  );
}
