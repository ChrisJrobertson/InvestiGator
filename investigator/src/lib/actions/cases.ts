"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthProfile, logAudit } from "./audit";
import { enforceCaseLimit } from "./plan-limits";

export async function listCases(filters?: {
  status?: string;
  priority?: string;
  client_id?: string;
  search?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from("cases")
    .select(
      "id, ref, title, description, status, priority, created_at, opened_at, due_date, assigned_to, client_id, clients(name), profiles!cases_assigned_to_fkey(name)"
    )
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.client_id) query = query.eq("client_id", filters.client_id);
  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCase(id: string) {
  const supabase = await createClient();

  const { data: caseData, error } = await supabase
    .from("cases")
    .select(
      "*, clients(id, name, email, contact_person), profiles!cases_assigned_to_fkey(id, name, email)"
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);

  const [findingsRes, timeRes, expenseRes, reportsRes] = await Promise.all([
    supabase
      .from("findings")
      .select("id, evidence_ref, title, description, finding_type, severity, status, found_at, found_by, location, profiles!findings_found_by_fkey(name), evidence_files(id, file_name, file_type, file_size, storage_path, hash_sha256, uploaded_at)")
      .eq("case_id", id)
      .order("found_at", { ascending: false }),
    supabase
      .from("time_entries")
      .select("id, description, hours, rate, date, billable, invoice_id, profile_id, profiles(name)")
      .eq("case_id", id)
      .is("deleted_at", null)
      .order("date", { ascending: false }),
    supabase
      .from("expenses")
      .select("id, description, amount, category, date, billable, invoice_id, profile_id, profiles(name)")
      .eq("case_id", id)
      .is("deleted_at", null)
      .order("date", { ascending: false }),
    supabase
      .from("reports")
      .select("id, title, content, report_type, status, version, created_at, approved_at, pdf_storage_path, word_storage_path, prompt_tokens, completion_tokens")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const totalHours = (timeRes.data ?? []).reduce(
    (sum, e) => sum + Number(e.hours),
    0
  );
  const totalTimeCost = (timeRes.data ?? []).reduce(
    (sum, e) => sum + Number(e.hours) * Number(e.rate || 0),
    0
  );
  const totalExpenses = (expenseRes.data ?? []).reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  return {
    ...caseData,
    findings: findingsRes.data ?? [],
    time_entries: timeRes.data ?? [],
    expenses: expenseRes.data ?? [],
    reports: reportsRes.data ?? [],
    stats: {
      findings_count: findingsRes.data?.length ?? 0,
      total_hours: totalHours,
      total_time_cost: totalTimeCost,
      total_expenses: totalExpenses,
      total_cost: totalTimeCost + totalExpenses,
    },
  };
}

export interface CaseFormData {
  title: string;
  description?: string;
  client_id?: string;
  assigned_to?: string;
  priority: string;
  due_date?: string;
}

export async function createCase(formData: CaseFormData) {
  const supabase = await createClient();
  const { user, profile } = await getAuthProfile();

  await enforceCaseLimit(profile.organisation_id);

  const { data: ref } = await supabase.rpc("next_ref", {
    p_key: `org:${profile.organisation_id}`,
    p_prefix: `INV-${new Date().getFullYear()}`,
  });

  if (!ref) throw new Error("Failed to generate case reference");

  const { data, error } = await supabase
    .from("cases")
    .insert({
      organisation_id: profile.organisation_id,
      ref: ref as string,
      title: formData.title,
      description: formData.description || null,
      client_id: formData.client_id || null,
      assigned_to: formData.assigned_to || user.id,
      priority: formData.priority,
      due_date: formData.due_date || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit("CREATE", "case", data.id, {
    ref: data.ref,
    title: formData.title,
  });

  revalidatePath("/cases");
  revalidatePath("/");
  return data;
}

export async function updateCase(
  caseId: string,
  formData: Partial<CaseFormData> & { status?: string }
) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {};
  if (formData.title !== undefined) updates.title = formData.title;
  if (formData.description !== undefined)
    updates.description = formData.description || null;
  if (formData.client_id !== undefined)
    updates.client_id = formData.client_id || null;
  if (formData.assigned_to !== undefined)
    updates.assigned_to = formData.assigned_to || null;
  if (formData.priority !== undefined) updates.priority = formData.priority;
  if (formData.due_date !== undefined)
    updates.due_date = formData.due_date || null;
  if (formData.status !== undefined) updates.status = formData.status;

  const { data, error } = await supabase
    .from("cases")
    .update(updates)
    .eq("id", caseId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit("UPDATE", "case", caseId, updates);

  revalidatePath("/cases");
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
  return data;
}

export async function updateCaseStatus(caseId: string, status: string) {
  const supabase = await createClient();

  const updates: Record<string, unknown> = { status };
  if (status === "CLOSED") updates.closed_at = new Date().toISOString();

  const { error } = await supabase
    .from("cases")
    .update(updates)
    .eq("id", caseId);

  if (error) throw new Error(error.message);

  await logAudit("STATUS_CHANGE", "case", caseId, { status });

  revalidatePath("/cases");
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
}

export async function deleteCase(caseId: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId)
    .eq("status", "ISSUED");

  if (count && count > 0) {
    throw new Error(
      "Cannot delete a case with issued reports. Archive it instead."
    );
  }

  const { error } = await supabase.from("cases").delete().eq("id", caseId);

  if (error) throw new Error(error.message);

  await logAudit("DELETE", "case", caseId);

  revalidatePath("/cases");
  revalidatePath("/");
}

export async function getCaseStats() {
  const supabase = await createClient();

  const [openRes, progressRes, reviewRes, closedRes] = await Promise.all([
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("status", "OPEN"),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("status", "IN_PROGRESS"),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("status", "REVIEW"),
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("status", "CLOSED"),
  ]);

  return {
    open: openRes.count ?? 0,
    in_progress: progressRes.count ?? 0,
    review: reviewRes.count ?? 0,
    closed: closedRes.count ?? 0,
    active: (openRes.count ?? 0) + (progressRes.count ?? 0) + (reviewRes.count ?? 0),
  };
}
