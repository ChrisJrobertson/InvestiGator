"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthProfile, logAudit } from "./audit";

export async function generateInvoice(caseId: string) {
  const supabase = await createClient();
  const { profile } = await getAuthProfile();

  const { data: caseData } = await supabase
    .from("cases")
    .select("id, ref, client_id, organisation_id")
    .eq("id", caseId)
    .single();

  if (!caseData) throw new Error("Case not found");
  if (!caseData.client_id) throw new Error("Case must have a client assigned before invoicing");

  const { data: unbilledTime } = await supabase
    .from("time_entries")
    .select("id, description, hours, rate, date, billable")
    .eq("case_id", caseId)
    .is("invoice_id", null)
    .is("deleted_at", null)
    .eq("billable", true);

  const { data: unbilledExpenses } = await supabase
    .from("expenses")
    .select("id, description, amount, category, date, billable")
    .eq("case_id", caseId)
    .is("invoice_id", null)
    .is("deleted_at", null)
    .eq("billable", true);

  const timeItems = unbilledTime ?? [];
  const expenseItems = unbilledExpenses ?? [];

  if (timeItems.length === 0 && expenseItems.length === 0) {
    throw new Error("No unbilled items to invoice");
  }

  const { data: invoiceRef } = await supabase.rpc("next_ref", {
    p_key: `org:${profile.organisation_id}:invoices`,
    p_prefix: `INV-${new Date().getFullYear()}`,
  });

  if (!invoiceRef) throw new Error("Failed to generate invoice number");

  let subtotal = 0;
  const lineItems: { description: string; quantity: number; unit_price: number; amount: number; sort_order: number; type: string }[] = [];

  timeItems.forEach((t, i) => {
    const amount = Number(t.hours) * Number(t.rate || 0);
    subtotal += amount;
    lineItems.push({
      description: `${t.date} — ${t.description}`,
      quantity: Number(t.hours),
      unit_price: Number(t.rate || 0),
      amount,
      sort_order: i,
      type: "TIME",
    });
  });

  expenseItems.forEach((e, i) => {
    const amount = Number(e.amount);
    subtotal += amount;
    lineItems.push({
      description: `${e.category}: ${e.description}`,
      quantity: 1,
      unit_price: amount,
      amount,
      sort_order: timeItems.length + i,
      type: "EXPENSE",
    });
  });

  const { data: org } = await supabase
    .from("organisations")
    .select("vat_registered, settings")
    .eq("id", profile.organisation_id)
    .single();

  const vatRate = org?.vat_registered ? 0.2 : 0;
  const tax = Math.round(subtotal * vatRate * 100) / 100;
  const total = subtotal + tax;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const { data: invoice, error: invError } = await supabase
    .from("invoices")
    .insert({
      organisation_id: profile.organisation_id,
      client_id: caseData.client_id,
      case_id: caseId,
      invoice_number: invoiceRef as string,
      status: "DRAFT",
      subtotal,
      tax,
      total,
      issued_at: new Date().toISOString().slice(0, 10),
      due_at: dueDate.toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (invError) throw new Error(invError.message);

  const itemsToInsert = lineItems.map((li) => ({
    invoice_id: invoice.id,
    ...li,
  }));

  const { error: liError } = await supabase.from("invoice_line_items").insert(itemsToInsert);
  if (liError) throw new Error(liError.message);

  const now = new Date().toISOString();
  const timeIds = timeItems.map((t) => t.id);
  const expenseIds = expenseItems.map((e) => e.id);

  if (timeIds.length > 0) {
    await supabase
      .from("time_entries")
      .update({ invoice_id: invoice.id, billed_at: now })
      .in("id", timeIds);
  }

  if (expenseIds.length > 0) {
    await supabase
      .from("expenses")
      .update({ invoice_id: invoice.id, billed_at: now })
      .in("id", expenseIds);
  }

  await logAudit("GENERATE", "invoice", invoice.id, {
    invoice_number: invoice.invoice_number,
    total,
    time_entries: timeIds.length,
    expenses: expenseIds.length,
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/billing");
  return invoice;
}

export async function listInvoices(filters?: { status?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select("id, invoice_number, status, subtotal, tax, total, issued_at, due_at, paid_at, case_id, client_id, clients(name), cases(ref, title), created_at")
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getInvoice(invoiceId: string) {
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, clients(name, email, address, contact_person), cases(ref, title), organisations(name, email, address, phone, vat_number, vat_registered)")
    .eq("id", invoiceId)
    .single();

  if (error) throw new Error(error.message);

  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sort_order");

  return { ...invoice, line_items: lineItems ?? [] };
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };
  if (status === "PAID") updates.paid_at = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", invoiceId)
    .select("case_id")
    .single();

  if (error) throw new Error(error.message);

  await logAudit("STATUS_CHANGE", "invoice", invoiceId, { status });

  revalidatePath("/billing");
  if (data?.case_id) revalidatePath(`/cases/${data.case_id}`);
}
