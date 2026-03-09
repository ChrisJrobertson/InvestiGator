"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthProfile, logAudit } from "./audit";

async function computeSHA256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadEvidenceFile(
  findingId: string,
  caseId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { user, profile } = await getAuthProfile();

  const file = formData.get("file") as File;
  if (!file || file.size === 0) throw new Error("No file provided");

  if (file.size > 52428800) {
    throw new Error("File exceeds 50 MB limit");
  }

  const buffer = await file.arrayBuffer();
  const hash = await computeSHA256(buffer);

  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${profile.organisation_id}/${caseId}/${timestamp}-${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from("evidence")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data, error } = await supabase
    .from("evidence_files")
    .insert({
      finding_id: findingId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      hash_sha256: hash,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit("UPLOAD", "evidence_file", data.id, {
    finding_id: findingId,
    file_name: file.name,
    file_size: file.size,
    hash_sha256: hash,
    storage_path: storagePath,
  });

  revalidatePath(`/cases/${caseId}`);
  return data;
}

export async function getSignedUrl(fileId: string, caseId: string) {
  const supabase = await createClient();

  const { data: file } = await supabase
    .from("evidence_files")
    .select("storage_path, file_name")
    .eq("id", fileId)
    .single();

  if (!file) throw new Error("File not found");

  const { data, error } = await supabase.storage
    .from("evidence")
    .createSignedUrl(file.storage_path, 3600);

  if (error) throw new Error(`Failed to generate download URL: ${error.message}`);

  await logAudit("DOWNLOAD", "evidence_file", fileId, {
    file_name: file.file_name,
  });

  return { url: data.signedUrl, fileName: file.file_name };
}

export async function deleteEvidenceFile(fileId: string, caseId: string) {
  const supabase = await createClient();

  const { data: file } = await supabase
    .from("evidence_files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (!file) throw new Error("File not found");

  const { error } = await supabase
    .from("evidence_files")
    .delete()
    .eq("id", fileId);

  if (error) throw new Error(error.message);

  await logAudit("SOFT_DELETE", "evidence_file", fileId, {
    file_name: file.file_name,
    storage_path: file.storage_path,
    hash_sha256: file.hash_sha256,
  });

  revalidatePath(`/cases/${caseId}`);
}

export async function listEvidenceFiles(findingId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("evidence_files")
    .select("id, file_name, file_type, file_size, storage_path, hash_sha256, uploaded_at, uploaded_by, profiles!evidence_files_uploaded_by_fkey(name)")
    .eq("finding_id", findingId)
    .order("uploaded_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
