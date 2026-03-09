"use server";

import React from "react";
import { Readable } from "node:stream";
import { revalidatePath } from "next/cache";
import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/actions/audit";

const invoiceStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: "#111827" },
  title: { fontSize: 18, marginBottom: 4 },
  section: { marginTop: 12 },
  tableHeader: { flexDirection: "row", borderBottom: "1 solid #e5e7eb", paddingBottom: 4 },
  row: { flexDirection: "row", borderBottom: "1 solid #f3f4f6", paddingVertical: 4 },
  colDate: { width: "22%" },
  colDesc: { width: "40%" },
  colQty: { width: "12%", textAlign: "right" },
  colRate: { width: "13%", textAlign: "right" },
  colAmount: { width: "13%", textAlign: "right" },
});

async function toBufferOutput(output: unknown) {
  if (Buffer.isBuffer(output)) return output;
  if (output instanceof Uint8Array) return Buffer.from(output);
  if (output instanceof ArrayBuffer) return Buffer.from(output);

  if (output instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of output) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  const arrayBuffer = await new Response(output as unknown as BodyInit).arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateInvoice(caseId: string, startDate?: string, endDate?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_invoice_from_unbilled", {
    p_case_id: caseId,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
  });
  if (error) throw error;

  const invoiceId = String(data);
  await logAudit("invoice.generated", "invoice", invoiceId, {
    caseId,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/billing");
  return invoiceId;
}

export async function listInvoices(filters?: {
  status?: string;
  clientId?: string;
  from?: string;
  to?: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select("id, invoice_number, status, issue_date, due_date, total, client_id, case_id")
    .order("issue_date", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.clientId) query = query.eq("client_id", filters.clientId);
  if (filters?.from) query = query.gte("issue_date", filters.from);
  if (filters?.to) query = query.lte("issue_date", filters.to);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getInvoice(id: string) {
  const supabase = await createClient();
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !invoice) throw error ?? new Error("Invoice not found");

  const { data: lineItems, error: lineError } = await supabase
    .from("invoice_line_items")
    .select("id, description, quantity, unit_price, amount, type, created_at")
    .eq("invoice_id", id)
    .order("created_at", { ascending: true });
  if (lineError) throw lineError;

  return { ...invoice, line_items: lineItems ?? [] };
}

export async function updateInvoiceStatus(id: string, status: string) {
  const supabase = await createClient();
  const updatePayload: Record<string, string> = { status };
  if (status === "PAID") {
    updatePayload.paid_date = new Date().toISOString();
    updatePayload.paid_at = new Date().toISOString().slice(0, 10);
  }

  const { data, error } = await supabase
    .from("invoices")
    .update(updatePayload)
    .eq("id", id)
    .select("case_id")
    .single();
  if (error) throw error;

  await logAudit("invoice.status_updated", "invoice", id, { status });
  if (data?.case_id) revalidatePath(`/cases/${data.case_id}`);
  revalidatePath("/billing");
}

export async function getBillingStats() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("status, total");
  if (error) throw error;

  return (data ?? []).reduce(
    (acc, invoice) => {
      const total = Math.round(Number(invoice.total ?? 0));
      acc.totalBilled += total;
      if (invoice.status === "PAID") acc.totalPaid += total;
      if (invoice.status !== "PAID" && invoice.status !== "CANCELLED") acc.totalOutstanding += total;
      return acc;
    },
    { totalBilled: 0, totalPaid: 0, totalOutstanding: 0 },
  );
}

export async function generateInvoicePdf(invoiceId: string) {
  const supabase = await createClient();
  const invoice = await getInvoice(invoiceId);
  const lineItems = invoice.line_items as Array<{
    id: string;
    created_at: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;

  const page = React.createElement(
    Page,
    { size: "A4", style: invoiceStyles.page },
    React.createElement(Text, { style: invoiceStyles.title }, `Invoice ${invoice.invoice_number}`),
    React.createElement(Text, null, `Issue date: ${new Date(invoice.issue_date).toLocaleDateString("en-GB")}`),
    React.createElement(Text, null, `Due date: ${new Date(invoice.due_date).toLocaleDateString("en-GB")}`),
    React.createElement(
      View,
      { style: invoiceStyles.section },
      React.createElement(
        View,
        { style: invoiceStyles.tableHeader },
        React.createElement(Text, { style: invoiceStyles.colDate }, "Date"),
        React.createElement(Text, { style: invoiceStyles.colDesc }, "Description"),
        React.createElement(Text, { style: invoiceStyles.colQty }, "Qty"),
        React.createElement(Text, { style: invoiceStyles.colRate }, "Rate"),
        React.createElement(Text, { style: invoiceStyles.colAmount }, "Amount"),
      ),
      ...lineItems.map((item) =>
        React.createElement(
          View,
          { key: item.id, style: invoiceStyles.row },
          React.createElement(
            Text,
            { style: invoiceStyles.colDate },
            new Date(item.created_at).toLocaleDateString("en-GB"),
          ),
          React.createElement(Text, { style: invoiceStyles.colDesc }, item.description),
          React.createElement(Text, { style: invoiceStyles.colQty }, String(item.quantity)),
          React.createElement(Text, { style: invoiceStyles.colRate }, String(item.unit_price)),
          React.createElement(Text, { style: invoiceStyles.colAmount }, String(item.amount)),
        ),
      ),
    ),
    React.createElement(View, { style: invoiceStyles.section }, [
      React.createElement(Text, { key: "subtotal" }, `Subtotal: £${(Number(invoice.subtotal) / 100).toFixed(2)}`),
      React.createElement(Text, { key: "tax" }, `VAT: £${(Number(invoice.tax) / 100).toFixed(2)}`),
      React.createElement(Text, { key: "total" }, `Total: £${(Number(invoice.total) / 100).toFixed(2)}`),
    ]),
  );

  const doc = React.createElement(Document, null, page);
  const output = await pdf(doc).toBuffer();
  const buffer = await toBufferOutput(output);
  const path = `invoices/${invoice.case_id ?? "general"}/${invoice.id}.pdf`;

  const { error: uploadError } = await supabase.storage.from("evidence").upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from("invoices")
    .update({ pdf_storage_path: path })
    .eq("id", invoiceId);
  if (updateError) throw updateError;

  const { data: signed, error: signError } = await supabase.storage
    .from("evidence")
    .createSignedUrl(path, 3600);
  if (signError) throw signError;

  await logAudit("invoice.exported_pdf", "invoice", invoiceId, { path });
  revalidatePath("/billing");
  return signed.signedUrl;
}
