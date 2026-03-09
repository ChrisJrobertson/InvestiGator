"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthProfile, logAudit } from "./audit";

export interface FindingFormData {
  title: string;
  description?: string;
  finding_type: string;
  severity: string;
  location?: string;
  found_at?: string;
}

export async function listFindings(caseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("findings")
    .select(
      "id, evidence_ref, title, description, finding_type, severity, status, found_at, found_by, location, metadata, created_at, profiles!findings_found_by_fkey(name), evidence_files(id, file_name, file_type, file_size, storage_path, hash_sha256, uploaded_at)"
    )
    .eq("case_id", caseId)
    .order("found_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createFinding(caseId: string, formData: FindingFormData) {
  const supabase = await createClient();
  const { user } = await getAuthProfile();

  const { data: ref } = await supabase.rpc("next_ref", {
    p_key: `case:${caseId}`,
    p_prefix: "EV",
  });

  if (!ref) throw new Error("Failed to generate evidence reference");

  const { data, error } = await supabase
    .from("findings")
    .insert({
      case_id: caseId,
      evidence_ref: ref as string,
      title: formData.title,
      description: formData.description || null,
      finding_type: formData.finding_type,
      severity: formData.severity,
      location: formData.location || null,
      found_at: formData.found_at || new Date().toISOString(),
      found_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit("CREATE", "finding", data.id, {
    evidence_ref: data.evidence_ref,
    title: formData.title,
    finding_type: formData.finding_type,
    severity: formData.severity,
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
  return data;
}

export async function updateFinding(
  findingId: string,
  formData: { title?: string; description?: string; severity?: string; location?: string }
) {
  const supabase = await createClient();

  const { data: before } = await supabase
    .from("findings")
    .select("*")
    .eq("id", findingId)
    .single();

  if (!before) throw new Error("Finding not found");

  const updates: Record<string, unknown> = {};
  if (formData.title !== undefined) updates.title = formData.title;
  if (formData.description !== undefined) updates.description = formData.description || null;
  if (formData.severity !== undefined) updates.severity = formData.severity;
  if (formData.location !== undefined) updates.location = formData.location || null;

  const { data, error } = await supabase
    .from("findings")
    .update(updates)
    .eq("id", findingId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit("UPDATE", "finding", findingId, {
    before: { title: before.title, description: before.description, severity: before.severity },
    after: updates,
  });

  revalidatePath(`/cases/${before.case_id}`);
  return data;
}

export async function deleteFinding(findingId: string) {
  const supabase = await createClient();

  const { data: before } = await supabase
    .from("findings")
    .select("*")
    .eq("id", findingId)
    .single();

  if (!before) throw new Error("Finding not found");

  const { error } = await supabase
    .from("findings")
    .delete()
    .eq("id", findingId);

  if (error) throw new Error(error.message);

  await logAudit("DELETE", "finding", findingId, {
    evidence_ref: before.evidence_ref,
    title: before.title,
    full_state: before,
  });

  revalidatePath(`/cases/${before.case_id}`);
  revalidatePath("/");
}

export async function verifyFinding(findingId: string) {
  const supabase = await createClient();
  const { user } = await getAuthProfile();

  const { data: before } = await supabase
    .from("findings")
    .select("case_id, status")
    .eq("id", findingId)
    .single();

  if (!before) throw new Error("Finding not found");

  const { error } = await supabase
    .from("findings")
    .update({ status: "CONFIRMED" })
    .eq("id", findingId);

  if (error) throw new Error(error.message);

  await logAudit("VERIFY", "finding", findingId, {
    verified_by: user.id,
    previous_status: before.status,
  });

  revalidatePath(`/cases/${before.case_id}`);
}
