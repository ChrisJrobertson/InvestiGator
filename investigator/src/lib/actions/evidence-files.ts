"use server";

import { webcrypto } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, logAudit } from "@/lib/actions/audit";

type UploadInternalInput = {
  file: File;
  findingId: string;
  caseId: string;
  organisationId: string;
  uploadedById: string;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

async function sha256Hex(buffer: ArrayBuffer) {
  const cryptoApi = globalThis.crypto?.subtle ? globalThis.crypto : webcrypto;
  const hashBuffer = await cryptoApi.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadEvidenceFileInternal({
  file,
  findingId,
  caseId,
  organisationId,
  uploadedById,
}: UploadInternalInput) {
  const supabase = await createClient();
  const timestamp = Date.now();
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${organisationId}/${caseId}/${timestamp}-${safeName}`;
  const buffer = await file.arrayBuffer();
  const hash = await sha256Hex(buffer);

  const { error: uploadError } = await supabase.storage
    .from("evidence")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const payload = {
    finding_id: findingId,
    case_id: caseId,
    file_name: file.name,
    file_type: file.type || "application/octet-stream",
    file_size: file.size,
    storage_path: storagePath,
    hash,
    hash_sha256: hash,
    uploaded_by: uploadedById,
    uploaded_by_id: uploadedById,
    uploaded_at: new Date().toISOString(),
  };

  const { data, error: insertError } = await supabase
    .from("evidence_files")
    .insert(payload)
    .select("id")
    .single();
  if (insertError) throw insertError;

  await logAudit("evidence.uploaded", "evidence_file", data.id, {
    findingId,
    caseId,
    fileName: file.name,
    size: file.size,
  });

  return data.id as string;
}

export async function uploadEvidenceFile(formData: FormData) {
  const profile = await getCurrentProfile();
  const file = formData.get("file");
  const findingId = String(formData.get("finding_id") ?? "");
  const caseId = String(formData.get("case_id") ?? "");

  if (!(file instanceof File)) throw new Error("No file provided");
  if (!findingId || !caseId) throw new Error("Finding and case are required");

  const id = await uploadEvidenceFileInternal({
    file,
    findingId,
    caseId,
    organisationId: profile.organisation_id,
    uploadedById: profile.id,
  });

  revalidatePath(`/cases/${caseId}`);
  return id;
}

export async function listEvidenceFiles(findingId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence_files")
    .select("id, file_name, file_type, file_size, storage_path, created_at")
    .eq("finding_id", findingId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createEvidenceDownloadUrl(fileId: string) {
  const supabase = await createClient();
  const { data: file, error } = await supabase
    .from("evidence_files")
    .select("id, storage_path, case_id")
    .eq("id", fileId)
    .single();
  if (error || !file) throw error ?? new Error("Evidence file not found");

  const { data: signed, error: signedError } = await supabase.storage
    .from("evidence")
    .createSignedUrl(file.storage_path, 3600);
  if (signedError) throw signedError;

  await logAudit("evidence.downloaded", "evidence_file", fileId, {
    caseId: file.case_id,
  });
  return signed.signedUrl;
}

export async function softDeleteEvidenceFile(fileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence_files")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", fileId)
    .select("case_id")
    .single();
  if (error) throw error;

  await logAudit("evidence.deleted", "evidence_file", fileId);
  if (data?.case_id) revalidatePath(`/cases/${data.case_id}`);
}
