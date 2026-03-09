"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthProfile, logAudit } from "./audit";
import { buildReportPrompt, type CaseForReport } from "@/lib/reportPrompts";
import Anthropic from "@anthropic-ai/sdk";

async function fetchCaseForReport(caseId: string): Promise<CaseForReport> {
  const supabase = await createClient();

  const { data: caseData, error } = await supabase
    .from("cases")
    .select("ref, title, type, description, opened_at, clients(name, contact_person)")
    .eq("id", caseId)
    .single();

  if (error) throw new Error(error.message);

  const { data: findings } = await supabase
    .from("findings")
    .select("evidence_ref, finding_type, title, description, location, found_at, severity, status, evidence_files(file_name)")
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .order("found_at", { ascending: true });

  const client = caseData.clients as unknown as { name: string; contact_person: string | null } | null;

  return {
    ref: caseData.ref,
    title: caseData.title,
    type: caseData.type,
    description: caseData.description,
    opened_at: caseData.opened_at,
    client,
    findings: (findings ?? []).map((f) => ({
      ...f,
      evidence_files: (f.evidence_files ?? []) as { file_name: string }[],
    })),
  };
}

export async function generateReport(caseId: string, reportType: string) {
  const { user } = await getAuthProfile();
  const supabase = await createClient();

  const caseForReport = await fetchCaseForReport(caseId);
  const { system, user: userPrompt, title } = buildReportPrompt(caseForReport, reportType);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured. Add it to your environment variables.");

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4000,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content
    .filter((block) => block.type === "text")
    .map((block) => {
      if (block.type === "text") return block.text;
      return "";
    })
    .join("\n");

  const { count: existingCount } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId)
    .eq("report_type", reportType);

  const version = (existingCount ?? 0) + 1;

  let parentReportId: string | null = null;
  if (version > 1) {
    const { data: prev } = await supabase
      .from("reports")
      .select("id")
      .eq("case_id", caseId)
      .eq("report_type", reportType)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    parentReportId = prev?.id ?? null;
  }

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      case_id: caseId,
      title,
      content,
      report_type: reportType,
      status: "DRAFT",
      version,
      parent_report_id: parentReportId,
      generated_by: user.id,
      generated_by_id: user.id,
      model_used: "claude-sonnet-4-5",
      prompt_tokens: response.usage?.input_tokens ?? null,
      completion_tokens: response.usage?.output_tokens ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit("GENERATE", "report", report.id, {
    report_type: reportType,
    version,
    model: "claude-sonnet-4-5",
    prompt_tokens: response.usage?.input_tokens,
    completion_tokens: response.usage?.output_tokens,
  });

  revalidatePath(`/cases/${caseId}`);
  return report;
}

export async function listReports(caseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .select("id, title, report_type, status, version, created_at, generated_by_id, approved_by_id, approved_at, pdf_storage_path, word_storage_path, prompt_tokens, completion_tokens, model_used, profiles!reports_generated_by_id_fkey(name)")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getReport(reportId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .select("*, profiles!reports_generated_by_id_fkey(name), cases(ref, title)")
    .eq("id", reportId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateReportContent(reportId: string, content: string) {
  const supabase = await createClient();
  const { user } = await getAuthProfile();

  const { data, error } = await supabase
    .from("reports")
    .update({
      content,
      edited_by_id: user.id,
      edited_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .select("case_id")
    .single();

  if (error) throw new Error(error.message);

  await logAudit("EDIT", "report", reportId, { edited_by: user.id });

  revalidatePath(`/cases/${data.case_id}`);
}

export async function approveReport(reportId: string) {
  const supabase = await createClient();
  const { user } = await getAuthProfile();

  const { data, error } = await supabase
    .from("reports")
    .update({
      status: "APPROVED",
      approved_by: user.id,
      approved_by_id: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .select("case_id")
    .single();

  if (error) throw new Error(error.message);

  await logAudit("APPROVE", "report", reportId, { approved_by: user.id });

  revalidatePath(`/cases/${data.case_id}`);
}

export async function regenerateReport(caseId: string, reportType: string) {
  return generateReport(caseId, reportType);
}

export async function exportReportWord(reportId: string) {
  const supabase = await createClient();
  const report = await getReport(reportId);
  if (!report) throw new Error("Report not found");

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");

  const lines = (report.content ?? "").split("\n");
  const paragraphs: InstanceType<typeof Paragraph>[] = [];

  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: "CONFIDENTIAL", bold: true, size: 20, color: "FF0000" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: report.title, bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: (report.cases as unknown as { ref: string })?.ref ?? "", size: 24, color: "00D4AA" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  for (const line of lines) {
    if (line.startsWith("### ")) {
      paragraphs.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3, spacing: { before: 200 } }));
    } else if (line.startsWith("## ")) {
      paragraphs.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2, spacing: { before: 300 } }));
    } else if (line.startsWith("# ")) {
      paragraphs.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }));
    } else if (line.startsWith("- ")) {
      paragraphs.push(new Paragraph({ text: line.slice(2), bullet: { level: 0 } }));
    } else if (line.startsWith("**") && line.endsWith("**")) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: line.slice(2, -2), bold: true })] }));
    } else if (line.trim() === "") {
      paragraphs.push(new Paragraph({ text: "" }));
    } else {
      const children: InstanceType<typeof TextRun>[] = [];
      const parts = line.split(/(\[EV-\d+\]|\[EVD-\d+\])/g);
      for (const part of parts) {
        if (/^\[EV-?\d+\]$/.test(part) || /^\[EVD-\d+\]$/.test(part)) {
          children.push(new TextRun({ text: part, color: "00D4AA", bold: true }));
        } else {
          children.push(new TextRun({ text: part }));
        }
      }
      paragraphs.push(new Paragraph({ children }));
    }
  }

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const buffer = await Packer.toBuffer(doc);
  const storagePath = `reports/${report.case_id}/${reportId}.docx`;

  await supabase.storage.from("evidence").upload(storagePath, buffer, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: true,
  });

  await supabase.from("reports").update({ word_storage_path: storagePath }).eq("id", reportId);

  const { data: signed } = await supabase.storage.from("evidence").createSignedUrl(storagePath, 3600);

  await logAudit("EXPORT_WORD", "report", reportId);

  revalidatePath(`/cases/${report.case_id}`);
  return { url: signed?.signedUrl ?? "", fileName: `${report.title}.docx` };
}
