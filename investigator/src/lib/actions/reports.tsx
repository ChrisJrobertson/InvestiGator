"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import {
  Document as WordDocument,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { Readable } from "node:stream";
import { buildReportPrompt, type CaseWithRelations } from "@/lib/reportPrompts";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, logAudit } from "@/lib/actions/audit";

type ReportType =
  | "FULL_INVESTIGATION"
  | "SURVEILLANCE"
  | "DUE_DILIGENCE"
  | "BACKGROUND_CHECK"
  | "OSINT_INTELLIGENCE"
  | "INTERIM_UPDATE"
  | "EXECUTIVE_SUMMARY";

type AnthropicResponseLike = {
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: "#111827" },
  coverTitle: { fontSize: 20, marginBottom: 8 },
  muted: { color: "#4b5563", marginBottom: 4 },
  sectionTitle: { fontSize: 14, marginTop: 16, marginBottom: 8 },
  paragraph: { lineHeight: 1.5, marginBottom: 8 },
  confidential: { color: "#0f766e", marginTop: 12 },
});

async function getCaseWithRelations(caseId: string): Promise<CaseWithRelations> {
  const supabase = await createClient();
  const { data: baseCase, error: caseError } = await supabase
    .from("cases")
    .select("id, ref, title, type, description, opened_at, client_id")
    .eq("id", caseId)
    .single();
  if (caseError || !baseCase) throw caseError ?? new Error("Case not found");

  const [{ data: client }, { data: findings }] = await Promise.all([
    baseCase.client_id
      ? supabase
          .from("clients")
          .select("name, contact_name")
          .eq("id", baseCase.client_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("findings")
      .select("id, evidence_ref, type, content, source, timestamp, deleted_at")
      .eq("case_id", caseId)
      .order("timestamp", { ascending: true }),
  ]);

  const findingIds = (findings ?? []).map((item) => item.id);
  const { data: files } = findingIds.length
    ? await supabase
        .from("evidence_files")
        .select("finding_id, file_name")
        .in("finding_id", findingIds)
        .is("deleted_at", null)
    : { data: [] as Array<{ finding_id: string; file_name: string }> };

  const filesByFinding = new Map<string, Array<{ file_name: string }>>();
  for (const file of files ?? []) {
    const list = filesByFinding.get(file.finding_id) ?? [];
    list.push({ file_name: file.file_name });
    filesByFinding.set(file.finding_id, list);
  }

  return {
    ref: baseCase.ref,
    title: baseCase.title,
    type: baseCase.type,
    description: baseCase.description,
    opened_date: new Date(baseCase.opened_at ?? Date.now()).toISOString(),
    client: client ? { name: client.name, contact_name: client.contact_name ?? null } : null,
    findings: (findings ?? []).map((finding) => ({
      evidence_ref: finding.evidence_ref,
      type: finding.type,
      content: finding.content ?? "",
      source: finding.source ?? "Unknown",
      timestamp: finding.timestamp ?? new Date().toISOString(),
      deleted_at: finding.deleted_at,
      files: filesByFinding.get(finding.id) ?? [],
    })),
  };
}

function extractTextFromAnthropicResponse(response: AnthropicResponseLike) {
  return (response.content ?? [])
    .filter((item) => item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n\n")
    .trim();
}

async function generateReportInternal(caseId: string, reportType: ReportType, parentReportId?: string) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const caseData = await getCaseWithRelations(caseId);
  const prompt = buildReportPrompt(caseData, reportType);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const aiResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const aiParsed = aiResponse as unknown as AnthropicResponseLike;
  const content = extractTextFromAnthropicResponse(aiParsed);

  const { data: latestRows } = await supabase
    .from("reports")
    .select("id, version")
    .eq("case_id", caseId)
    .order("version", { ascending: false })
    .limit(1);
  const latest = latestRows?.[0];
  const version = (latest?.version ?? 0) + 1;

  const title = `${reportType.replaceAll("_", " ")} · ${caseData.ref}`;
  const payload = {
    case_id: caseId,
    parent_report_id: parentReportId ?? latest?.id ?? null,
    version,
    title,
    report_type: reportType,
    content,
    status: "DRAFT",
    generated_at: new Date().toISOString(),
    generated_by: profile.id,
    generated_by_id: profile.id,
    model_used: "claude-sonnet-4-5",
    prompt_tokens: aiParsed.usage?.input_tokens ?? null,
    completion_tokens: aiParsed.usage?.output_tokens ?? null,
  };

  const { data: inserted, error } = await supabase
    .from("reports")
    .insert(payload)
    .select("id, case_id, version")
    .single();
  if (error) throw error;

  await logAudit("report.generated", "report", inserted.id, {
    caseId,
    reportType,
    version,
    model: "claude-sonnet-4-5",
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/reports");
  return inserted;
}

export async function generateReport(caseId: string, reportType: ReportType) {
  return generateReportInternal(caseId, reportType);
}

export async function regenerateReport(caseId: string, reportType: ReportType) {
  const supabase = await createClient();
  const { data: latestRows } = await supabase
    .from("reports")
    .select("id")
    .eq("case_id", caseId)
    .order("version", { ascending: false })
    .limit(1);
  const latest = latestRows?.[0];
  return generateReportInternal(caseId, reportType, latest?.id);
}

export async function listReports(caseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, title, report_type, status, version, created_at")
    .eq("case_id", caseId)
    .order("version", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getReport(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateReport(id: string, content: string) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("reports")
    .update({
      content,
      edited_at: new Date().toISOString(),
      edited_by_id: profile.id,
      status: "REVIEW",
    })
    .eq("id", id)
    .select("id, case_id")
    .single();
  if (error) throw error;

  await logAudit("report.updated", "report", id);
  revalidatePath(`/cases/${data.case_id}`);
}

export async function approveReport(id: string) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("reports")
    .update({
      status: "APPROVED",
      approved_at: now,
      approved_by: profile.id,
      approved_by_id: profile.id,
    })
    .eq("id", id)
    .select("case_id")
    .single();
  if (error) throw error;

  await logAudit("report.approved", "report", id, { approvedAt: now });
  revalidatePath(`/cases/${data.case_id}`);
}

async function uploadReportAsset(reportId: string, caseId: string, ext: "pdf" | "docx", body: Buffer) {
  const supabase = await createClient();
  const path = `reports/${caseId}/${reportId}.${ext}`;
  const { error } = await supabase.storage.from("evidence").upload(path, body, {
    contentType:
      ext === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

async function toNodeBuffer(data: unknown) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (data instanceof ArrayBuffer) return Buffer.from(data);

  if (data instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of data) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  if (
    data &&
    typeof data === "object" &&
    "getReader" in data &&
    typeof (data as { getReader?: unknown }).getReader === "function"
  ) {
    const arrayBuffer = await new Response(data as BodyInit).arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error("Unsupported PDF output type");
}

export async function exportReportPdf(reportId: string) {
  const supabase = await createClient();
  const report = await getReport(reportId);

  const doc = (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.coverTitle}>{report.title}</Text>
        <Text style={pdfStyles.muted}>Case: {report.case_id}</Text>
        <Text style={pdfStyles.muted}>Generated: {new Date(report.created_at).toLocaleString("en-GB")}</Text>
        <Text style={pdfStyles.confidential}>CONFIDENTIAL</Text>
        <View>
          <Text style={pdfStyles.sectionTitle}>Report Content</Text>
          <Text style={pdfStyles.paragraph}>{report.content}</Text>
        </View>
      </Page>
    </Document>
  );

  const pdfOutput = await pdf(doc).toBuffer();
  const pdfBuffer = await toNodeBuffer(pdfOutput);
  const path = await uploadReportAsset(report.id, report.case_id, "pdf", pdfBuffer);

  const { error: updateError } = await supabase
    .from("reports")
    .update({ pdf_storage_path: path })
    .eq("id", reportId);
  if (updateError) throw updateError;

  const { data: signed, error: signError } = await supabase.storage
    .from("evidence")
    .createSignedUrl(path, 3600);
  if (signError) throw signError;

  await logAudit("report.exported_pdf", "report", reportId, { path });
  revalidatePath(`/cases/${report.case_id}`);
  return signed.signedUrl;
}

export async function exportReportWord(reportId: string) {
  const supabase = await createClient();
  const report = await getReport(reportId);

  const doc = new WordDocument({
    sections: [
      {
        children: [
          new Paragraph({
            text: report.title,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [new TextRun({ text: "CONFIDENTIAL", bold: true })],
          }),
          ...String(report.content)
            .split("\n")
            .filter(Boolean)
            .map((line) => new Paragraph(line)),
        ],
      },
    ],
  });

  const wordBuffer = await Packer.toBuffer(doc);
  const path = await uploadReportAsset(report.id, report.case_id, "docx", wordBuffer);

  const { error: updateError } = await supabase
    .from("reports")
    .update({ word_storage_path: path })
    .eq("id", reportId);
  if (updateError) throw updateError;

  const { data: signed, error: signError } = await supabase.storage
    .from("evidence")
    .createSignedUrl(path, 3600);
  if (signError) throw signError;

  await logAudit("report.exported_word", "report", reportId, { path });
  revalidatePath(`/cases/${report.case_id}`);
  return signed.signedUrl;
}
