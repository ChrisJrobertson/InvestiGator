import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface InvoicePreviewProps {
  invoice: {
    invoice_number: string;
    status: string;
    subtotal: number;
    tax: number;
    total: number;
    issued_at?: string;
    due_at?: string;
  };
  lineItems: LineItem[];
  clientName: string;
  orgName: string;
}

const statusVariant = (s: string) => {
  switch (s) {
    case "PAID": return "accent" as const;
    case "SENT": return "info" as const;
    case "OVERDUE": return "danger" as const;
    default: return "default" as const;
  }
};

export function InvoicePreview({ invoice, lineItems, clientName, orgName }: InvoicePreviewProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-text font-mono">{invoice.invoice_number}</h2>
          <p className="text-sm text-text-muted">{orgName}</p>
        </div>
        <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <p className="text-text-muted">Bill To</p>
          <p className="text-text font-medium">{clientName}</p>
        </div>
        <div className="text-right">
          {invoice.issued_at && (
            <p className="text-text-muted">Issued: {formatDate(invoice.issued_at)}</p>
          )}
          {invoice.due_at && (
            <p className="text-text-muted">Due: {formatDate(invoice.due_at)}</p>
          )}
        </div>
      </div>

      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 text-text-muted font-medium">Description</th>
            <th className="text-right py-2 text-text-muted font-medium">Qty</th>
            <th className="text-right py-2 text-text-muted font-medium">Rate</th>
            <th className="text-right py-2 text-text-muted font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2 text-text">{item.description}</td>
              <td className="py-2 text-right text-text font-mono">{item.quantity}</td>
              <td className="py-2 text-right text-text font-mono">{formatCurrency(item.unit_price)}</td>
              <td className="py-2 text-right text-text font-mono">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-border pt-3 space-y-1 text-sm text-right">
        <div className="flex justify-end gap-8">
          <span className="text-text-muted">Subtotal</span>
          <span className="font-mono text-text">{formatCurrency(invoice.subtotal)}</span>
        </div>
        <div className="flex justify-end gap-8">
          <span className="text-text-muted">Tax (GST)</span>
          <span className="font-mono text-text">{formatCurrency(invoice.tax)}</span>
        </div>
        <div className="flex justify-end gap-8 pt-2 border-t border-border">
          <span className="font-medium text-text">Total</span>
          <span className="font-mono font-bold text-accent text-lg">{formatCurrency(invoice.total)}</span>
        </div>
      </div>
    </div>
  );
}
