import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Briefcase, Search, FileText, Clock, Plus, Users } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, organisation_id")
    .eq("id", user!.id)
    .single();

  const orgId = profile?.organisation_id;

  // Fetch stats in parallel
  const [casesRes, findingsRes, reportsRes, hoursRes, recentCasesRes] = await Promise.all([
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", orgId!)
      .in("status", ["OPEN", "IN_PROGRESS", "REVIEW"]),
    supabase
      .from("findings")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("time_entries")
      .select("hours")
      .gte("date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
    supabase
      .from("cases")
      .select("id, ref, title, status, priority, created_at")
      .eq("organisation_id", orgId!)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalHours = (hoursRes.data ?? []).reduce(
    (sum, entry) => sum + Number(entry.hours),
    0
  );

  const statusVariant = (status: string) => {
    switch (status) {
      case "OPEN": return "accent" as const;
      case "IN_PROGRESS": return "warning" as const;
      case "REVIEW": return "info" as const;
      default: return "default" as const;
    }
  };

  return (
    <>
      <Header
        title={`Welcome back, ${profile?.name ?? "Investigator"}`}
        description="Here's what's happening with your cases"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Active Cases" value={casesRes.count ?? 0} icon={Briefcase} />
        <StatCard title="Total Findings" value={findingsRes.count ?? 0} icon={Search} />
        <StatCard title="Reports Generated" value={reportsRes.count ?? 0} icon={FileText} />
        <StatCard title="Hours This Month" value={totalHours.toFixed(1)} icon={Clock} />
      </div>

      {/* Quick Actions + Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-text mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/cases?new=true"
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:bg-surface-light transition-colors"
            >
              <div className="rounded-lg bg-accent/10 p-2">
                <Plus className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">New Case</p>
                <p className="text-xs text-text-muted">Start a new investigation</p>
              </div>
            </Link>
            <Link
              href="/clients?new=true"
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:bg-surface-light transition-colors"
            >
              <div className="rounded-lg bg-accent/10 p-2">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">New Client</p>
                <p className="text-xs text-text-muted">Add a new client record</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Cases */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-text mb-4">Recent Cases</h2>
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            {(recentCasesRes.data ?? []).length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-text-muted">
                No cases yet. Create your first case to get started.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(recentCasesRes.data ?? []).map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-light transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-accent">{c.ref}</span>
                      <span className="text-sm text-text truncate">{c.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                      <span className="text-xs text-text-muted hidden sm:inline">
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
