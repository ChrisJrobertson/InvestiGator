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

export function buildReportPrompt(caseData: CaseWithRelations, reportType: string) {
  return `Generate a ${reportType} report for case ${caseData.ref}.`;
}
