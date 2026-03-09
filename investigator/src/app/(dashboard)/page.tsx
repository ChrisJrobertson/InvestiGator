import Link from "next/link";
import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: activeCases }, { count: totalFindings }, { count: totalReports }] =
    await Promise.all([
      supabase
        .from("cases")
        .select("*", { count: "exact", head: true })
        .in("status", ["OPEN", "ACTIVE", "ON_HOLD"]),
      supabase.from("findings").select("*", { count: "exact", head: true }),
      supabase.from("reports").select("*", { count: "exact", head: true }),
    ]);

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("organisation_id")
        .eq("id", user.id)
        .single()
    : { data: null };

  const { data: org } = profile
    ? await supabase
        .from("organisations")
        .select("plan, ai_credits_used")
        .eq("id", profile.organisation_id)
        .single()
    : { data: null };

  const aiLimit =
    org?.plan === "AGENCY" ? 500 : org?.plan === "PROFESSIONAL" ? 150 : 50;
  const aiRemaining = Math.max(0, aiLimit - (org?.ai_credits_used ?? 0));

  const { data: recentCases } = await supabase
    .from("cases")
    .select("id, ref, title, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <PageWrapper>
      <Header title="Dashboard" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Cases" value={activeCases ?? 0} />
        <StatCard label="Total Findings" value={totalFindings ?? 0} />
        <StatCard label="Reports Generated" value={totalReports ?? 0} />
        <StatCard label="AI Credits Remaining" value={aiRemaining} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-lg font-semibold">Recent cases</h2>
          {!recentCases?.length ? (
            <EmptyState
              title="Create your first case to get started"
              description="No cases yet."
              action={
                <Link
                  href="/cases"
                  className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#05241d]"
                >
                  New Case
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2">
              {recentCases.map((item) => (
                <li key={item.id} className="rounded-md border border-[var(--border)] p-3">
                  <p className="mono text-xs text-[var(--accent)]">{item.ref}</p>
                  <p className="text-sm font-medium">{item.title}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-lg font-semibold">Quick actions</h2>
          <div className="space-y-2">
            <Link
              href="/cases"
              className="block rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-light)]"
            >
              New Case
            </Link>
            <Link
              href="/clients"
              className="block rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-light)]"
            >
              New Client
            </Link>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
