"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, logAudit } from "@/lib/actions/audit";

export async function listTimeEntries(caseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .select("id, case_id, date, hours, description, rate, billable, invoice_id, deleted_at")
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .order("date", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const totals = rows.reduce(
    (acc, item) => {
      const hours = Number(item.hours ?? 0);
      const rate = Number(item.rate ?? 0);
      acc.totalHours += hours;
      acc.totalAmountPence += Math.round(hours * rate);
      return acc;
    },
    { totalHours: 0, totalAmountPence: 0 },
  );

  return { rows, ...totals };
}

export async function createTimeEntry(formData: FormData) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const caseId = String(formData.get("case_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const hours = Number(formData.get("hours") ?? 0);
  const description = String(formData.get("description") ?? "");
  const rate = Number(formData.get("rate") ?? 0);
  const billable = String(formData.get("billable") ?? "") === "on";

  if (!caseId) throw new Error("Case is required.");
  if (!date) throw new Error("Date is required.");
  if (new Date(date) > new Date()) throw new Error("Date cannot be in the future.");
  if (hours <= 0) throw new Error("Hours must be greater than zero.");

  const payload = {
    case_id: caseId,
    user_id: profile.id,
    profile_id: profile.id,
    date,
    hours,
    description,
    rate,
    billable,
  };

  const { data, error } = await supabase
    .from("time_entries")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;

  await logAudit("time_entry.created", "time_entry", data.id, payload);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/billing");
}

export async function updateTimeEntry(id: string, formData: FormData) {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("time_entries")
    .select("case_id, invoice_id")
    .eq("id", id)
    .single();
  if (existingError || !existing) throw existingError ?? new Error("Time entry not found");
  if (existing.invoice_id) throw new Error("Cannot edit an invoiced time entry.");

  const payload = {
    date: String(formData.get("date") ?? ""),
    hours: Number(formData.get("hours") ?? 0),
    description: String(formData.get("description") ?? ""),
    rate: Number(formData.get("rate") ?? 0),
    billable: String(formData.get("billable") ?? "") === "on",
  };
  if (new Date(payload.date) > new Date()) throw new Error("Date cannot be in the future.");
  if (payload.hours <= 0) throw new Error("Hours must be greater than zero.");

  const { error } = await supabase.from("time_entries").update(payload).eq("id", id);
  if (error) throw error;

  await logAudit("time_entry.updated", "time_entry", id, payload);
  revalidatePath(`/cases/${existing.case_id}`);
  revalidatePath("/billing");
}

export async function deleteTimeEntry(id: string) {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("time_entries")
    .select("case_id, invoice_id")
    .eq("id", id)
    .single();
  if (existingError || !existing) throw existingError ?? new Error("Time entry not found");
  if (existing.invoice_id) throw new Error("Cannot delete an invoiced time entry.");

  const { error } = await supabase
    .from("time_entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  await logAudit("time_entry.deleted", "time_entry", id);
  revalidatePath(`/cases/${existing.case_id}`);
  revalidatePath("/billing");
}
