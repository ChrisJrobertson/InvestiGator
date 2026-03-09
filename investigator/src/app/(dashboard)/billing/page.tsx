import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Receipt, Clock, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function BillingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user!.id)
    .single();

  const [timeRes, expenseRes, invoiceRes] = await Promise.all([
    supabase.from("time_entries").select("hours, rate").eq("profile_id", user!.id),
    supabase.from("expenses").select("amount"),
    supabase
      .from("invoices")
      .select("id, invoice_number, status, total, due_at")
      .eq("organisation_id", profile!.organisation_id)
      .order("created_at", { ascending: false }),
  ]);

  const totalHours = (timeRes.data ?? []).reduce((s, e) => s + Number(e.hours), 0);
  const totalRevenue = (timeRes.data ?? []).reduce(
    (s, e) => s + Number(e.hours) * Number(e.rate || 0),
    0
  );
  const totalExpenses = (expenseRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0);

  return (
    <>
      <Header title="Billing" description="Time tracking, expenses, and invoices" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Hours" value={totalHours.toFixed(1)} icon={Clock} />
        <StatCard title="Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} />
        <StatCard title="Expenses" value={formatCurrency(totalExpenses)} icon={Receipt} />
      </div>

      <h2 className="text-lg font-semibold text-text mb-4">Invoices</h2>
      {(invoiceRes.data ?? []).length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Invoices will appear here once you create them from case billing."
        />
      ) : (
        <div className="space-y-3">
          {(invoiceRes.data ?? []).map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
            >
              <span className="font-mono text-sm text-accent">{inv.invoice_number}</span>
              <span className="font-mono text-sm text-text">{formatCurrency(inv.total)}</span>
              <span className="text-xs text-text-muted">{inv.status}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
