export interface CaseWithRelations {
  ref: string;
  title: string;
  type: string;
  description: string | null;
  opened_date: string;
  client: { name: string; contact_name: string | null } | null;
  findings: {
    evidence_ref: string;
    type: string;
    content: string;
    source: string;
    timestamp: string;
    deleted_at: string | null;
    files: { file_name: string }[];
  }[];
}

const SHARED_INSTRUCTIONS = `
You are drafting a professional UK private investigation report.
- Use clear, factual UK English.
- Do not speculate beyond provided evidence.
- Reference evidence using [EV-XXX] markers.
- Keep tone objective and court-ready.
`.trim();

function caseHeader(caseData: CaseWithRelations) {
  return `
Case Reference: ${caseData.ref}
Case Title: ${caseData.title}
Case Type: ${caseData.type}
Opened: ${caseData.opened_date}
Client: ${caseData.client?.name ?? "N/A"}
Client Contact: ${caseData.client?.contact_name ?? "N/A"}
Description: ${caseData.description ?? "N/A"}
`.trim();
}

function formatFindings(caseData: CaseWithRelations) {
  const rows = caseData.findings
    .filter((finding) => !finding.deleted_at)
    .map((finding) => {
      const files = finding.files.length
        ? `Files: ${finding.files.map((file) => file.file_name).join(", ")}`
        : "Files: none";
      return `- [${finding.evidence_ref}] ${finding.timestamp} | ${finding.type}\n  Source: ${finding.source}\n  Content: ${finding.content}\n  ${files}`;
    });

  return rows.length ? rows.join("\n") : "No findings available.";
}

const PROMPT_INTROS: Record<string, string> = {
  FULL_INVESTIGATION: "Produce a full investigation report.",
  SURVEILLANCE: "Produce a surveillance-focused report.",
  DUE_DILIGENCE: "Produce a due diligence report.",
  BACKGROUND_CHECK: "Produce a background check report.",
  OSINT_INTELLIGENCE: "Produce an OSINT intelligence report.",
  INTERIM_UPDATE: "Produce an interim update report.",
  EXECUTIVE_SUMMARY: "Produce an executive summary report.",
};

export function buildReportPrompt(caseData: CaseWithRelations, reportType: string) {
  const intro = PROMPT_INTROS[reportType] ?? "Produce a professional report.";

  return `
${SHARED_INSTRUCTIONS}

${intro}

${caseHeader(caseData)}

Findings:
${formatFindings(caseData)}

Output format:
1) Executive Summary
2) Scope and Method
3) Chronology of Findings
4) Analysis
5) Conclusions
6) Recommendations
7) Statement of truth: "I confirm that this report is true to the best of my knowledge and based on the evidence listed."
`.trim();
}
