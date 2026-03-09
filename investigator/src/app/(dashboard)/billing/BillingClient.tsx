"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { updateInvoiceStatus } from "@/lib/actions/invoices";
import { INVOICE_STATUSES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  case_id: string | null;
  clients: { name: string } | { name: string }[] | null;
  cases: { ref: string; title: string } | { ref: string; title: string }[] | null;
}

const statusVariant = (s: string) => {
  switch (s) {
    case "PAID": return "accent" as const;
    case "SENT": return "info" as const;
    case "OVERDUE": return "danger" as const;
    default: return "default" as const;
  }
};

function unwrap<T>(val: T | T[] | null): T | null {
  if (!val) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

export function BillingClient({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = statusFilter ? invoices.filter((i) => i.status === statusFilter) : invoices;

  const handleStatusChange = (invoiceId: string, status: string) => {
    startTransition(async () => {
      try {
        await updateInvoiceStatus(invoiceId, status);
        toast("success", `Invoice marked as ${status}`);
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <select
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((inv) => {
          const client = unwrap(inv.clients);
          const caseData = unwrap(inv.cases);
          return (
            <div
              key={inv.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-accent font-medium">{inv.invoice_number}</span>
                  <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                </div>
                <span className="font-mono text-lg font-bold text-text">{formatCurrency(Number(inv.total))}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
                {client && <span>{client.name}</span>}
                {caseData && (
                  <Link href={`/cases/${inv.case_id}`} className="text-accent hover:underline">
                    {caseData.ref}
                  </Link>
                )}
                {inv.issued_at && <span>Issued: {formatDate(inv.issued_at)}</span>}
                {inv.due_at && <span>Due: {formatDate(inv.due_at)}</span>}
                {inv.paid_at && <span>Paid: {formatDate(inv.paid_at)}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-muted">Subtotal: {formatCurrency(Number(inv.subtotal))}</span>
                {Number(inv.tax) > 0 && <span className="text-text-muted">VAT: {formatCurrency(Number(inv.tax))}</span>}
                <div className="flex-1" />
                {inv.status === "DRAFT" && (
                  <Button size="sm" variant="secondary" onClick={() => handleStatusChange(inv.id, "SENT")} disabled={isPending}>
                    Mark Sent
                  </Button>
                )}
                {inv.status === "SENT" && (
                  <>
                    <Button size="sm" variant="primary" onClick={() => handleStatusChange(inv.id, "PAID")} disabled={isPending}>
                      Mark Paid
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleStatusChange(inv.id, "OVERDUE")} disabled={isPending}>
                      Mark Overdue
                    </Button>
                  </>
                )}
                {inv.status === "OVERDUE" && (
                  <Button size="sm" variant="primary" onClick={() => handleStatusChange(inv.id, "PAID")} disabled={isPending}>
                    Mark Paid
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
