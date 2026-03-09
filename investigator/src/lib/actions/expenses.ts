"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, logAudit } from "@/lib/actions/audit";

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

export async function listExpenses(caseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "id, case_id, description, amount, category, date, receipt_path, invoice_id, deleted_at, created_at",
    )
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .order("date", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const totalAmountPence = rows.reduce(
    (sum, item) => sum + Math.round(Number(item.amount ?? 0)),
    0,
  );
  return { rows, totalAmountPence };
}

export async function createExpense(formData: FormData) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const caseId = String(formData.get("case_id") ?? "");
  const description = String(formData.get("description") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const category = String(formData.get("category") ?? "OTHER");
  const date = String(formData.get("date") ?? "");
  const billable = String(formData.get("billable") ?? "") === "on";
  const receipt = formData.get("receipt");

  if (!caseId) throw new Error("Case is required.");
  if (!description.trim()) throw new Error("Description is required.");
  if (amount <= 0) throw new Error("Amount must be greater than zero.");
  if (!date) throw new Error("Date is required.");

  let receiptPath: string | null = null;
  if (receipt instanceof File && receipt.size > 0) {
    const path = `${profile.organisation_id}/${caseId}/receipts/${Date.now()}-${sanitizeFileName(receipt.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(path, receipt, { contentType: receipt.type, upsert: false });
    if (uploadError) throw uploadError;
    receiptPath = path;
  }

  const payload = {
    case_id: caseId,
    profile_id: profile.id,
    description,
    amount,
    category,
    date,
    billable,
    receipt_path: receiptPath,
  };

  const { data, error } = await supabase
    .from("expenses")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;

  await logAudit("expense.created", "expense", data.id, {
    ...payload,
    hasReceipt: Boolean(receiptPath),
  });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/billing");
}

export async function updateExpense(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("expenses")
    .select("case_id, invoice_id")
    .eq("id", id)
    .single();
  if (existingError || !existing) throw existingError ?? new Error("Expense not found");
  if (existing.invoice_id) throw new Error("Cannot edit an invoiced expense.");

  const payload = {
    description: String(formData.get("description") ?? ""),
    amount: Number(formData.get("amount") ?? 0),
    category: String(formData.get("category") ?? "OTHER"),
    date: String(formData.get("date") ?? ""),
    billable: String(formData.get("billable") ?? "") === "on",
  };
  if (payload.amount <= 0) throw new Error("Amount must be greater than zero.");

  const { error } = await supabase.from("expenses").update(payload).eq("id", id);
  if (error) throw error;

  await logAudit("expense.updated", "expense", id, payload);
  revalidatePath(`/cases/${existing.case_id}`);
  revalidatePath("/billing");
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("expenses")
    .select("case_id, invoice_id")
    .eq("id", id)
    .single();
  if (existingError || !existing) throw existingError ?? new Error("Expense not found");
  if (existing.invoice_id) throw new Error("Cannot delete an invoiced expense.");

  const { error } = await supabase
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  await logAudit("expense.deleted", "expense", id);
  revalidatePath(`/cases/${existing.case_id}`);
  revalidatePath("/billing");
}
