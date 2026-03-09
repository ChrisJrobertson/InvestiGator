"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthProfile, logAudit } from "./audit";

export interface ExpenseFormData {
  description: string;
  amount: number;
  category: string;
  date: string;
  billable?: boolean;
}

export async function listExpenses(caseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select("id, description, amount, category, date, billable, invoice_id, profile_id, profiles(name), created_at")
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  const entries = data ?? [];
  const totalAmount = entries.reduce((s, e) => s + Number(e.amount), 0);
  const billableAmount = entries.filter((e) => e.billable).reduce((s, e) => s + Number(e.amount), 0);

  return { entries, totalAmount, billableAmount };
}

export async function createExpense(caseId: string, formData: ExpenseFormData) {
  const supabase = await createClient();
  const { user } = await getAuthProfile();

  if (formData.amount <= 0) throw new Error("Amount must be greater than 0");

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      case_id: caseId,
      profile_id: user.id,
      description: formData.description,
      amount: formData.amount,
      category: formData.category,
      date: formData.date,
      billable: formData.billable ?? true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit("CREATE", "expense", data.id, {
    case_id: caseId,
    amount: formData.amount,
    description: formData.description,
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/billing");
  revalidatePath("/");
  return data;
}

export async function updateExpense(expenseId: string, formData: Partial<ExpenseFormData>) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("expenses")
    .select("invoice_id, case_id")
    .eq("id", expenseId)
    .single();

  if (!existing) throw new Error("Expense not found");
  if (existing.invoice_id) throw new Error("Cannot edit an invoiced expense");

  if (formData.amount !== undefined && formData.amount <= 0) throw new Error("Amount must be greater than 0");

  const updates: Record<string, unknown> = {};
  if (formData.description !== undefined) updates.description = formData.description;
  if (formData.amount !== undefined) updates.amount = formData.amount;
  if (formData.category !== undefined) updates.category = formData.category;
  if (formData.date !== undefined) updates.date = formData.date;
  if (formData.billable !== undefined) updates.billable = formData.billable;

  const { error } = await supabase.from("expenses").update(updates).eq("id", expenseId);
  if (error) throw new Error(error.message);

  await logAudit("UPDATE", "expense", expenseId, updates);

  revalidatePath(`/cases/${existing.case_id}`);
  revalidatePath("/billing");
}

export async function deleteExpense(expenseId: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("expenses")
    .select("invoice_id, case_id")
    .eq("id", expenseId)
    .single();

  if (!existing) throw new Error("Expense not found");
  if (existing.invoice_id) throw new Error("Cannot delete an invoiced expense");

  const { error } = await supabase
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", expenseId);

  if (error) throw new Error(error.message);

  await logAudit("DELETE", "expense", expenseId);

  revalidatePath(`/cases/${existing.case_id}`);
  revalidatePath("/billing");
  revalidatePath("/");
}
