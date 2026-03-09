"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, logAudit } from "@/lib/actions/audit";

type ListCaseFilters = {
  status?: string;
  type?: string;
  clientId?: string;
};

export type CaseListItem = {
  id: string;
  ref: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  created_at: string;
  client_id: string | null;
};

export async function listCases(
  filters: ListCaseFilters = {},
): Promise<CaseListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("cases")
    .select("id, ref, title, type, status, priority, created_at, client_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.clientId) query = query.eq("client_id", filters.clientId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CaseListItem[];
}

export async function getCase(id: string) {
  const supabase = await createClient();
  const { data: currentCase, error } = await supabase
    .from("cases")
    .select(
      "id, ref, title, description, status, type, priority, due_date, rate, client_id, investigator_id",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) throw error;

  const [{ count: findingsCount }, { data: timeRows }, { data: expenseRows }] =
    await Promise.all([
      supabase
        .from("findings")
        .select("*", { count: "exact", head: true })
        .eq("case_id", id),
      supabase.from("time_entries").select("hours, rate").eq("case_id", id),
      supabase.from("expenses").select("amount").eq("case_id", id),
    ]);

  const timeTotalPence =
    timeRows?.reduce((sum, entry) => {
      const hours = Number(entry.hours ?? 0);
      const rate = Number(entry.rate ?? currentCase.rate ?? 500);
      return sum + Math.round(hours * rate);
    }, 0) ?? 0;

  const expenseTotalPence =
    expenseRows?.reduce((sum, item) => sum + Math.round(Number(item.amount ?? 0)), 0) ?? 0;

  return {
    ...currentCase,
    findingsCount: findingsCount ?? 0,
    timeTotalPence,
    expenseTotalPence,
  };
}

export async function createCase(formData: FormData) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: ref, error: refError } = await supabase.rpc("next_ref", {
    p_scope: `org:${profile.organisation_id}`,
    p_prefix: `INV-${new Date().getFullYear()}`,
  });
  if (refError || !ref) throw refError ?? new Error("Unable to generate case reference");

  const payload = {
    organisation_id: profile.organisation_id,
    client_id: String(formData.get("client_id") ?? "") || null,
    investigator_id: String(formData.get("investigator_id") ?? "") || null,
    ref: String(ref),
    title: String(formData.get("title") ?? ""),
    type: String(formData.get("type") ?? "OTHER"),
    status: String(formData.get("status") ?? "OPEN"),
    description: String(formData.get("description") ?? ""),
    rate: Number(formData.get("rate") ?? 500),
    priority: String(formData.get("priority") ?? "MEDIUM"),
    due_date: String(formData.get("due_date") ?? "") || null,
    assigned_to: String(formData.get("investigator_id") ?? "") || null,
  };

  const { data, error } = await supabase.from("cases").insert(payload).select("id").single();
  if (error) throw error;

  await logAudit("case.created", "case", data.id, payload);
  revalidatePath("/cases");
}

export async function updateCase(id: string, formData: FormData) {
  const supabase = await createClient();
  const payload = {
    title: String(formData.get("title") ?? ""),
    client_id: String(formData.get("client_id") ?? "") || null,
    investigator_id: String(formData.get("investigator_id") ?? "") || null,
    type: String(formData.get("type") ?? "OTHER"),
    status: String(formData.get("status") ?? "OPEN"),
    description: String(formData.get("description") ?? ""),
    rate: Number(formData.get("rate") ?? 500),
    priority: String(formData.get("priority") ?? "MEDIUM"),
    due_date: String(formData.get("due_date") ?? "") || null,
    assigned_to: String(formData.get("investigator_id") ?? "") || null,
  };

  const { error } = await supabase.from("cases").update(payload).eq("id", id);
  if (error) throw error;

  await logAudit("case.updated", "case", id, payload);
  revalidatePath("/cases");
  revalidatePath(`/cases/${id}`);
}

export async function updateCaseStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cases").update({ status }).eq("id", id);
  if (error) throw error;

  await logAudit("case.status_updated", "case", id, { status });
  revalidatePath("/cases");
  revalidatePath(`/cases/${id}`);
}

export async function deleteCase(id: string) {
  const supabase = await createClient();

  const { count, error: reportCheckError } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("case_id", id)
    .in("status", ["DELIVERED", "ISSUED"]);
  if (reportCheckError) throw reportCheckError;
  if ((count ?? 0) > 0) {
    throw new Error("Cannot delete a case with delivered reports.");
  }

  const { error } = await supabase
    .from("cases")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  await logAudit("case.deleted", "case", id);
  revalidatePath("/cases");
}

export async function getCaseStats() {
  const supabase = await createClient();

  const [{ count: openCases }, { count: activeCases }, { count: closedCases }] =
    await Promise.all([
      supabase
        .from("cases")
        .select("*", { count: "exact", head: true })
        .eq("status", "OPEN")
        .is("deleted_at", null),
      supabase
        .from("cases")
        .select("*", { count: "exact", head: true })
        .eq("status", "ACTIVE")
        .is("deleted_at", null),
      supabase
        .from("cases")
        .select("*", { count: "exact", head: true })
        .eq("status", "CLOSED")
        .is("deleted_at", null),
    ]);

  return {
    openCases: openCases ?? 0,
    activeCases: activeCases ?? 0,
    closedCases: closedCases ?? 0,
  };
}
