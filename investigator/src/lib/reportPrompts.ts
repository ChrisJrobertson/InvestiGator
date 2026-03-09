export const REPORT_SYSTEM_PROMPT = `You are an expert investigative report writer for a private investigation firm.
You produce clear, professional, legally-defensible investigation reports.
Use formal but accessible language. Be precise with dates, times, and facts.
Never speculate beyond the evidence provided. Flag gaps in evidence explicitly.`;

export const INTERIM_REPORT_PROMPT = `Generate an interim investigation report based on the following case data and findings.

Structure:
1. Executive Summary
2. Investigation Background
3. Methodology
4. Findings to Date
5. Analysis
6. Preliminary Conclusions
7. Recommended Next Steps
8. Appendices (list of evidence)

Case: {{case}}
Client: {{client}}
Findings: {{findings}}
Evidence Files: {{evidence}}`;

export const FINAL_REPORT_PROMPT = `Generate a final investigation report based on the following case data and findings.

Structure:
1. Executive Summary
2. Terms of Reference
3. Investigation Background
4. Methodology
5. Chronology of Events
6. Detailed Findings
7. Analysis & Discussion
8. Conclusions
9. Recommendations
10. Appendices

Case: {{case}}
Client: {{client}}
Findings: {{findings}}
Evidence Files: {{evidence}}
Time Entries: {{timeEntries}}`;

export const SUMMARY_REPORT_PROMPT = `Generate a concise summary report suitable for client presentation.
Keep it to 2-3 pages. Focus on key findings and actionable conclusions.

Case: {{case}}
Client: {{client}}
Findings: {{findings}}`;

export function fillTemplate(
  template: string,
  data: Record<string, string>
): string {
  return Object.entries(data).reduce(
    (result, [key, value]) => result.replace(`{{${key}}}`, value),
    template
  );
}
