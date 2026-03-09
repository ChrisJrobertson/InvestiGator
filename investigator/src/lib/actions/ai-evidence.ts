"use server";

import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { checkAndDeductCredits } from "@/lib/ai-credits";
import { getCurrentProfile, logAudit } from "@/lib/actions/audit";
import { createClient } from "@/lib/supabase/server";

const HF_API_URL = "https://api-inference.huggingface.co/models";

function getHfHeaders() {
  return {
    Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
  };
}

async function getEvidenceFile(fileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence_files")
    .select(
      "id, case_id, finding_id, file_name, file_type, file_size, storage_path, ocr_text, ai_description, transcription",
    )
    .eq("id", fileId)
    .single();
  if (error || !data) throw error ?? new Error("Evidence file not found");
  return data;
}

async function downloadEvidenceFile(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("evidence").download(path);
  if (error || !data) throw error ?? new Error("Failed to download evidence file");
  return data;
}

export async function extractTextFromFile(fileId: string) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const file = await getEvidenceFile(fileId);

  if (file.ocr_text) return file.ocr_text;
  if (file.file_size > 10 * 1024 * 1024) throw new Error("OCR max file size is 10MB.");
  if (!file.file_type.startsWith("image/") && file.file_type !== "application/pdf") {
    throw new Error("OCR supports image/* and application/pdf.");
  }

  const allowed = await checkAndDeductCredits(profile.organisation_id, 1);
  if (!allowed) throw new Error("AI credit limit reached. Upgrade plan or wait for monthly reset.");

  const blob = await downloadEvidenceFile(file.storage_path);
  const response = await fetch(`${HF_API_URL}/microsoft/trocr-base-printed`, {
    method: "POST",
    headers: getHfHeaders(),
    body: blob,
  });

  let text = "";
  if (response.ok) {
    const json = (await response.json()) as unknown;
    if (Array.isArray(json) && json[0] && typeof json[0] === "object" && "generated_text" in json[0]) {
      text = String((json[0] as { generated_text: string }).generated_text);
    } else if (json && typeof json === "object" && "text" in json) {
      text = String((json as { text: string }).text);
    }
  }

  const ocrText = text.trim() || "OCR extraction completed with no text returned.";
  await supabase
    .from("evidence_files")
    .update({
      ocr_text: ocrText,
      ai_processed_at: new Date().toISOString(),
      ai_model_used: "DeepSeek-OCR-compatible",
    })
    .eq("id", fileId);

  await logAudit("ai.ocr", "evidence_file", fileId, {
    model: "DeepSeek-OCR-compatible",
    caseId: file.case_id,
  });
  revalidatePath(`/cases/${file.case_id}`);
  return ocrText;
}

export async function describeEvidenceImage(fileId: string) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const file = await getEvidenceFile(fileId);

  if (file.ai_description) return file.ai_description;
  if (!file.file_type.startsWith("image/")) throw new Error("Image description requires an image file.");

  const allowed = await checkAndDeductCredits(profile.organisation_id, 1);
  if (!allowed) throw new Error("AI credit limit reached. Upgrade plan or wait for monthly reset.");

  const blob = await downloadEvidenceFile(file.storage_path);
  const arrayBuffer = await blob.arrayBuffer();
  const resized = await sharp(Buffer.from(arrayBuffer))
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const result = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: resized.toString("base64"),
            },
          },
          {
            type: "text",
            text: "You are assisting a UK PI. Describe objectively for an investigation report. Focus on people (number, build, clothing — do NOT identify), locations (signage), vehicles (make, model, colour, reg), activity, time indicators, visible text. Precise, factual, UK English.",
          },
        ],
      },
    ],
  });

  const description = result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n")
    .trim();

  await supabase
    .from("evidence_files")
    .update({
      ai_description: description,
      ai_processed_at: new Date().toISOString(),
      ai_model_used: "claude-haiku-4-5",
    })
    .eq("id", fileId);

  await logAudit("ai.image_desc", "evidence_file", fileId, { model: "claude-haiku-4-5" });
  revalidatePath(`/cases/${file.case_id}`);
  return description;
}

export async function transcribeAudio(fileId: string) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const file = await getEvidenceFile(fileId);

  if (file.transcription) return file.transcription;
  if (!file.file_type.startsWith("audio/") && !file.file_type.startsWith("video/")) {
    throw new Error("Transcription requires audio or video.");
  }
  if (file.file_size > 60 * 1024 * 1024) throw new Error("Transcription max file size is ~60MB.");

  const allowed = await checkAndDeductCredits(profile.organisation_id, 3);
  if (!allowed) throw new Error("AI credit limit reached. Upgrade plan or wait for monthly reset.");

  const blob = await downloadEvidenceFile(file.storage_path);
  const response = await fetch(`${HF_API_URL}/openai/whisper-large-v3`, {
    method: "POST",
    headers: getHfHeaders(),
    body: blob,
  });
  if (!response.ok) throw new Error("Transcription request failed.");

  const json = (await response.json()) as unknown;
  const text =
    json && typeof json === "object" && "text" in json
      ? String((json as { text: string }).text)
      : "Transcription completed but no text returned.";

  await supabase
    .from("evidence_files")
    .update({
      transcription: text,
      ai_processed_at: new Date().toISOString(),
      ai_model_used: "whisper-large-v3",
    })
    .eq("id", fileId);

  await logAudit("ai.transcription", "evidence_file", fileId, { model: "whisper-large-v3" });
  revalidatePath(`/cases/${file.case_id}`);
  return text;
}

export async function removeBackground(fileId: string) {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const file = await getEvidenceFile(fileId);

  if (!file.file_type.startsWith("image/")) throw new Error("Background removal requires image/*.");
  if (file.file_size > 5 * 1024 * 1024) throw new Error("Background removal max file size is 5MB.");

  const allowed = await checkAndDeductCredits(profile.organisation_id, 1);
  if (!allowed) throw new Error("AI credit limit reached. Upgrade plan or wait for monthly reset.");

  const blob = await downloadEvidenceFile(file.storage_path);
  const originalBuffer = Buffer.from(await blob.arrayBuffer());

  let processedBuffer = originalBuffer;
  const response = await fetch(`${HF_API_URL}/briaai/RMBG-1.4`, {
    method: "POST",
    headers: getHfHeaders(),
    body: blob,
  });
  if (response.ok) {
    processedBuffer = Buffer.from(await response.arrayBuffer());
  }

  const processedPath = `${profile.organisation_id}/${file.case_id}/processed/${Date.now()}-${file.file_name}`;
  const { error: uploadError } = await supabase.storage
    .from("evidence")
    .upload(processedPath, processedBuffer, {
      contentType: "image/png",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: newFile, error: insertError } = await supabase
    .from("evidence_files")
    .insert({
      finding_id: file.finding_id,
      case_id: file.case_id,
      file_name: `processed-${file.file_name}`,
      file_type: "image/png",
      file_size: processedBuffer.length,
      storage_path: processedPath,
      uploaded_by: profile.id,
      uploaded_by_id: profile.id,
      is_redacted: true,
      redacted_storage_path: processedPath,
      ai_model_used: "background-removal",
      ai_processed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  await logAudit("ai.background_removal", "evidence_file", newFile.id, {
    sourceFileId: fileId,
    model: "background-removal",
  });
  revalidatePath(`/cases/${file.case_id}`);
  return newFile.id as string;
}

export async function searchCaseEvidence(caseId: string, query: string) {
  const supabase = await createClient();
  const cleaned = query.trim();
  if (!cleaned) return [];

  const { data, error } = await supabase.rpc("search_case_evidence", {
    p_case_id: caseId,
    p_query: cleaned,
  });
  if (error) throw error;
  return data ?? [];
}
