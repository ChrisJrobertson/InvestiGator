"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthProfile, logAudit } from "./audit";

export interface TimeEntryFormData {
  description: string;
  hours: number;
  rate?: number;
  date: string;
  billable?: boolean;
}

export async function listTimeEntries(caseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("time_entries")
    .select("id, description, hours, rate, date, billable, invoice_id, profile_id, profiles(name), created_at")
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  const entries = data ?? [];
  const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
  const totalAmount = entries.reduce((s, e) => s + Number(e.hours) * Number(e.rate || 0), 0);
  const billableHours = entries.filter((e) => e.billable).reduce((s, e) => s + Number(e.hours), 0);

  return { entries, totalHours, totalAmount, billableHours };
}

export async function createTimeEntry(caseId: string, formData: TimeEntryFormData) {
  const supabase = await createClient();
  const { user } = await getAuthProfile();

  if (formData.hours <= 0) throw new Error("Hours must be greater than 0");

  const entryDate = new Date(formData.date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (entryDate > today) throw new Error("Date cannot be in the future");

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      case_id: caseId,
      profile_id: user.id,
      description: formData.description,
      hours: formData.hours,
      rate: formData.rate ?? null,
      date: formData.date,
      billable: formData.billable ?? true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit("CREATE", "time_entry", data.id, {
    case_id: caseId,
    hours: formData.hours,
    description: formData.description,
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/billing");
  revalidatePath("/");
  return data;
}

export async function updateTimeEntry(entryId: string, formData: Partial<TimeEntryFormData>) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("time_entries")
    .select("invoice_id, case_id")
    .eq("id", entryId)
    .single();

  if (!existing) throw new Error("Time entry not found");
  if (existing.invoice_id) throw new Error("Cannot edit an invoiced time entry");

  if (formData.hours !== undefined && formData.hours <= 0) throw new Error("Hours must be greater than 0");

  const updates: Record<string, unknown> = {};
  if (formData.description !== undefined) updates.description = formData.description;
  if (formData.hours !== undefined) updates.hours = formData.hours;
  if (formData.rate !== undefined) updates.rate = formData.rate;
  if (formData.date !== undefined) updates.date = formData.date;
  if (formData.billable !== undefined) updates.billable = formData.billable;

  const { error } = await supabase.from("time_entries").update(updates).eq("id", entryId);
  if (error) throw new Error(error.message);

  await logAudit("UPDATE", "time_entry", entryId, updates);

  revalidatePath(`/cases/${existing.case_id}`);
  revalidatePath("/billing");
}

export async function deleteTimeEntry(entryId: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("time_entries")
    .select("invoice_id, case_id")
    .eq("id", entryId)
    .single();

  if (!existing) throw new Error("Time entry not found");
  if (existing.invoice_id) throw new Error("Cannot delete an invoiced time entry");

  const { error } = await supabase
    .from("time_entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", entryId);

  if (error) throw new Error(error.message);

  await logAudit("DELETE", "time_entry", entryId);

  revalidatePath(`/cases/${existing.case_id}`);
  revalidatePath("/billing");
  revalidatePath("/");
}
