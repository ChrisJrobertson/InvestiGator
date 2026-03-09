export interface CaseForReport {
  ref: string;
  title: string;
  type: string;
  description: string | null;
  opened_at: string;
  client: { name: string; contact_person: string | null } | null;
  findings: {
    evidence_ref: string;
    finding_type: string;
    title: string;
    description: string | null;
    location: string | null;
    found_at: string;
    severity: string;
    status: string;
    evidence_files: { file_name: string }[];
  }[];
}

const SYSTEM_INSTRUCTION = `You are an expert investigative report writer for a private investigation firm.
You produce clear, professional, legally-defensible investigation reports.
Use formal but accessible language. Be precise with dates, times, and facts.
Never speculate beyond the evidence provided. Flag gaps in evidence explicitly.
Reference evidence items using their evidence reference codes in square brackets, e.g. [EV-001].
Use markdown formatting with proper heading hierarchy (# for title, ## for sections, ### for subsections).`;

function formatFindings(findings: CaseForReport["findings"]): string {
  return findings
    .map(
      (f) =>
        `[${f.evidence_ref}] (${f.finding_type}, ${f.severity}, ${f.status})
Title: ${f.title}
${f.description ? `Detail: ${f.description}` : ""}
${f.location ? `Location/Source: ${f.location}` : ""}
Date: ${f.found_at}
${f.evidence_files.length > 0 ? `Attached files: ${f.evidence_files.map((ef) => ef.file_name).join(", ")}` : ""}`
    )
    .join("\n\n");
}

function formatCaseContext(c: CaseForReport): string {
  return `Case Reference: ${c.ref}
Title: ${c.title}
Type: ${c.type}
${c.description ? `Description: ${c.description}` : ""}
Date Opened: ${c.opened_at}
${c.client ? `Client: ${c.client.name}${c.client.contact_person ? ` (Contact: ${c.client.contact_person})` : ""}` : "No client assigned"}`;
}

const REPORT_TEMPLATES: Record<
  string,
  { title: string; structure: string }
> = {
  FULL_INVESTIGATION: {
    title: "Full Investigation Report",
    structure: `Structure the report as follows:
## Executive Summary
## Terms of Reference
## Investigation Background
## Methodology
## Chronology of Events
## Detailed Findings
(For each finding, reference the evidence code and describe in detail)
## Analysis & Discussion
## Conclusions
## Recommendations
## Appendix: Evidence Register
(Table listing all evidence items with their reference codes)`,
  },
  SURVEILLANCE: {
    title: "Surveillance Report",
    structure: `Structure the report as follows:
## Executive Summary
## Subject Details
## Surveillance Parameters
## Chronological Log
(Detailed timeline of observations with timestamps and evidence references)
## Photographic/Video Evidence Summary
## Behavioural Analysis
## Conclusions
## Appendix: Evidence Log`,
  },
  DUE_DILIGENCE: {
    title: "Due Diligence Report",
    structure: `Structure the report as follows:
## Executive Summary
## Scope of Investigation
## Company/Individual Profile
## Corporate Records Review
## Financial Analysis
## Litigation & Regulatory History
## Media & Reputation Analysis
## Key Findings
## Risk Assessment
## Recommendations
## Appendix: Sources & Evidence`,
  },
  BACKGROUND_CHECK: {
    title: "Background Check Report",
    structure: `Structure the report as follows:
## Executive Summary
## Subject Information
## Identity Verification
## Employment History
## Education Verification
## Criminal Records Check
## Credit & Financial Summary
## Professional References
## Social Media & Online Presence
## Findings Summary
## Risk Rating
## Appendix: Evidence & Sources`,
  },
  OSINT_INTELLIGENCE: {
    title: "OSINT Intelligence Report",
    structure: `Structure the report as follows:
## Executive Summary
## Intelligence Requirements
## Methodology & Sources
## Digital Footprint Analysis
## Social Media Intelligence
## Domain & Infrastructure Analysis
## Associated Entities
## Threat Assessment
## Key Intelligence Findings
## Recommendations
## Appendix: Source URLs & Evidence`,
  },
  INTERIM_UPDATE: {
    title: "Interim Update Report",
    structure: `Structure the report as follows:
## Summary of Progress
## Work Completed Since Last Update
## Key Findings to Date
## Outstanding Actions
## Preliminary Analysis
## Timeline & Next Steps
## Budget Status
## Evidence Register Update`,
  },
  EXECUTIVE_SUMMARY: {
    title: "Executive Summary",
    structure: `Structure the report as follows:
## Overview
(2-3 paragraph high-level summary)
## Key Findings
(Bullet-pointed list of the most significant findings with evidence references)
## Risk Assessment
## Recommended Actions
Keep this concise — no more than 2-3 pages.`,
  },
};

export function buildReportPrompt(
  caseData: CaseForReport,
  reportType: string
): { system: string; user: string; title: string } {
  const template = REPORT_TEMPLATES[reportType];
  if (!template) {
    throw new Error(`Unknown report type: ${reportType}`);
  }

  const caseContext = formatCaseContext(caseData);
  const findingsText = formatFindings(caseData.findings);

  const user = `Generate a ${template.title} for the following investigation case.

${template.structure}

---
CASE DETAILS:
${caseContext}

---
EVIDENCE & FINDINGS (${caseData.findings.length} items):
${findingsText || "No findings recorded yet."}

---
IMPORTANT INSTRUCTIONS:
- Reference evidence items using their codes in square brackets, e.g. [EV-001]
- Use markdown formatting with proper heading hierarchy
- Be precise with dates and facts — do not invent details
- If evidence is insufficient for a conclusion, state this explicitly
- Mark the document as CONFIDENTIAL
- Include today's date as the report date`;

  return {
    system: SYSTEM_INSTRUCTION,
    user,
    title: `${template.title} — ${caseData.ref}`,
  };
}

export const REPORT_TYPES = Object.keys(REPORT_TEMPLATES) as Array<
  keyof typeof REPORT_TEMPLATES
>;

export function getReportTypeLabel(type: string): string {
  return REPORT_TEMPLATES[type]?.title ?? type;
}
