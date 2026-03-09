import { listInvoices } from "@/lib/actions/invoices";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Receipt, DollarSign, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BillingClient } from "./BillingClient";

export default async function BillingPage() {
  const invoices = await listInvoices();

  const totalBilled = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + Number(i.total), 0);
  const totalOutstanding = invoices
    .filter((i) => ["SENT", "OVERDUE", "DRAFT"].includes(i.status))
    .reduce((s, i) => s + Number(i.total), 0);

  return (
    <>
      <Header title="Billing" description="Invoices and financial overview" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Billed" value={formatCurrency(totalBilled)} icon={DollarSign} />
        <StatCard title="Total Paid" value={formatCurrency(totalPaid)} icon={Receipt} />
        <StatCard title="Outstanding" value={formatCurrency(totalOutstanding)} icon={AlertTriangle} />
      </div>

      <h2 className="text-lg font-semibold text-text mb-4">Invoices</h2>
      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Generate invoices from the case detail page to see them here."
        />
      ) : (
        <BillingClient invoices={invoices} />
      )}
    </>
  );
}
