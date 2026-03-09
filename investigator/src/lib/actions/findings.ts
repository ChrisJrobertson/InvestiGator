"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, logAudit } from "@/lib/actions/audit";
import { uploadEvidenceFileInternal } from "@/lib/actions/evidence-files";

export type FindingListItem = {
  id: string;
  case_id: string;
  evidence_ref: string;
  type: string;
  content: string;
  source: string;
  timestamp: string;
  is_verified: boolean;
  deleted_at: string | null;
  files: Array<{
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    storage_path: string;
    ocr_text: string | null;
    ai_description: string | null;
    transcription: string | null;
  }>;
};

export async function listFindings(caseId: string): Promise<FindingListItem[]> {
  const supabase = await createClient();
  const { data: findings, error } = await supabase
    .from("findings")
    .select("id, case_id, evidence_ref, type, content, source, timestamp, is_verified, deleted_at")
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .order("timestamp", { ascending: true });

  if (error) throw error;
  const findingRows = findings ?? [];

  if (!findingRows.length) return [];

  const ids = findingRows.map((item) => item.id);
  const { data: files, error: filesError } = await supabase
    .from("evidence_files")
    .select("id, finding_id, file_name, file_type, file_size, storage_path, ocr_text, ai_description, transcription")
    .in("finding_id", ids)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (filesError) throw filesError;

  const filesByFinding = new Map<string, FindingListItem["files"]>();
  for (const file of files ?? []) {
    const list = filesByFinding.get(file.finding_id) ?? [];
    list.push({
      id: file.id,
      file_name: file.file_name,
      file_type: file.file_type,
      file_size: Number(file.file_size),
      storage_path: file.storage_path,
      ocr_text: file.ocr_text,
      ai_description: file.ai_description,
      transcription: file.transcription,
    });
    filesByFinding.set(file.finding_id, list);
  }

  return findingRows.map((finding) => ({
    ...finding,
    type: finding.type ?? "OBSERVATION",
    content: finding.content ?? "",
    source: finding.source ?? "",
    timestamp: finding.timestamp ?? new Date().toISOString(),
    is_verified: Boolean(finding.is_verified),
    files: filesByFinding.get(finding.id) ?? [],
  })) as FindingListItem[];
}

export async function createFinding(formData: FormData) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const caseId = String(formData.get("case_id") ?? "");
  if (!caseId) throw new Error("Case is required");

  const findingType = String(formData.get("type") ?? "OBSERVATION");
  const source = String(formData.get("source") ?? "Manual entry");
  const timestamp = String(formData.get("timestamp") ?? "") || new Date().toISOString();
  const content = String(formData.get("content") ?? "").trim();
  const clientVisible = String(formData.get("client_visible") ?? "") === "on";

  if (!content) throw new Error("Finding content is required.");

  const { data: ref, error: refError } = await supabase.rpc("next_ref", {
    p_scope: `case:${caseId}`,
    p_prefix: "EV",
  });
  if (refError || !ref) throw refError ?? new Error("Unable to generate evidence ref");

  const payload = {
    case_id: caseId,
    user_id: profile.id,
    found_by: profile.id,
    evidence_ref: String(ref),
    type: findingType,
    finding_type: findingType,
    title: content.slice(0, 80),
    content,
    description: content,
    source,
    timestamp,
    found_at: timestamp,
    status: "DRAFT",
    client_visible: clientVisible,
  };

  const { data: finding, error } = await supabase
    .from("findings")
    .insert(payload)
    .select("id, evidence_ref")
    .single();
  if (error) throw error;

  const files = formData.getAll("files").filter((item): item is File => item instanceof File);
  for (const file of files) {
    if (!file.size) continue;
    await uploadEvidenceFileInternal({
      file,
      findingId: finding.id,
      caseId,
      organisationId: profile.organisation_id,
      uploadedById: profile.id,
    });
  }

  await logAudit("finding.created", "finding", finding.id, {
    evidenceRef: finding.evidence_ref,
    fileCount: files.length,
  });
  revalidatePath(`/cases/${caseId}`);
}

export async function updateFinding(id: string, formData: FormData) {
  const supabase = await createClient();
  const content = String(formData.get("content") ?? "").trim();
  const source = String(formData.get("source") ?? "Manual entry").trim();
  if (!content) throw new Error("Finding content is required.");

  const { data: before, error: beforeError } = await supabase
    .from("findings")
    .select("id, case_id, evidence_ref, timestamp, content, source")
    .eq("id", id)
    .single();
  if (beforeError || !before) throw beforeError ?? new Error("Finding not found");

  const payload = {
    content,
    source,
    description: content,
    title: content.slice(0, 80),
  };

  const { error } = await supabase.from("findings").update(payload).eq("id", id);
  if (error) throw error;

  await logAudit("finding.updated", "finding", id, {
    before: { content: before.content, source: before.source },
    after: payload,
    immutable: {
      evidence_ref: before.evidence_ref,
      timestamp: before.timestamp,
    },
  });
  revalidatePath(`/cases/${before.case_id}`);
}

export async function deleteFinding(id: string) {
  const supabase = await createClient();
  const { data: before, error: beforeError } = await supabase
    .from("findings")
    .select("id, case_id, evidence_ref, content, source, timestamp")
    .eq("id", id)
    .single();
  if (beforeError || !before) throw beforeError ?? new Error("Finding not found");

  const { error } = await supabase
    .from("findings")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  await logAudit("finding.deleted", "finding", id, { before });
  revalidatePath(`/cases/${before.case_id}`);
}

export async function verifyFinding(id: string) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("findings")
    .update({
      is_verified: true,
      verified_by_id: profile.id,
      verified_at: now,
    })
    .eq("id", id)
    .select("case_id")
    .single();
  if (error) throw error;

  await logAudit("finding.verified", "finding", id, { verifiedAt: now });
  revalidatePath(`/cases/${data.case_id}`);
}
