import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  generateInvoicePdf,
  getBillingStats,
  listInvoices,
  updateInvoiceStatus,
} from "@/lib/actions/invoices";
import { formatCurrencyFromPence } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; client_id?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const [stats, invoices] = await Promise.all([
    getBillingStats(),
    listInvoices({
      status: params.status,
      clientId: params.client_id,
      from: params.from,
      to: params.to,
    }),
  ]);

  async function updateStatusAction(formData: FormData) {
    "use server";
    const invoiceId = String(formData.get("invoice_id") ?? "");
    const status = String(formData.get("status") ?? "");
    if (!invoiceId || !status) return;
    await updateInvoiceStatus(invoiceId, status);
  }

  async function exportPdfAction(formData: FormData) {
    "use server";
    const invoiceId = String(formData.get("invoice_id") ?? "");
    if (!invoiceId) return;
    const url = await generateInvoicePdf(invoiceId);
    redirect(url);
  }

  return (
    <PageWrapper>
      <Header title="Billing" />
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-muted)]">Total billed</p>
          <p className="mt-1 text-xl font-semibold">{formatCurrencyFromPence(stats.totalBilled)}</p>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-muted)]">Total paid</p>
          <p className="mt-1 text-xl font-semibold">{formatCurrencyFromPence(stats.totalPaid)}</p>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-muted)]">Total outstanding</p>
          <p className="mt-1 text-xl font-semibold">
            {formatCurrencyFromPence(stats.totalOutstanding)}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <form className="grid gap-2 md:grid-cols-5">
          <Input name="status" placeholder="Status" defaultValue={params.status ?? ""} />
          <Input name="client_id" placeholder="Client ID" defaultValue={params.client_id ?? ""} />
          <Input name="from" type="date" defaultValue={params.from ?? ""} />
          <Input name="to" type="date" defaultValue={params.to ?? ""} />
          <Button type="submit" variant="ghost">
            Apply filters
          </Button>
        </form>
      </section>

      <section className="mt-6">
        {!invoices.length ? (
          <EmptyState title="No invoices yet" description="Generate an invoice from a case page." />
        ) : (
          <ul className="space-y-2">
            {invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">
                    {invoice.invoice_number} · {invoice.status} ·{" "}
                    {formatCurrencyFromPence(Math.round(Number(invoice.total)))}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <form action={updateStatusAction} className="flex gap-2">
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      <select
                        name="status"
                        defaultValue={invoice.status}
                        className="h-9 rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-xs"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="SENT">SENT</option>
                        <option value="PAID">PAID</option>
                        <option value="OVERDUE">OVERDUE</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                      <Button type="submit" variant="ghost">
                        Update
                      </Button>
                    </form>
                    <form action={exportPdfAction}>
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      <Button type="submit" variant="ghost">
                        PDF
                      </Button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageWrapper>
  );
}
