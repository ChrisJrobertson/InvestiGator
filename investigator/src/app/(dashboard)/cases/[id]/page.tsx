import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAiUsage } from "@/lib/ai-credits";
import { getCurrentProfile } from "@/lib/actions/audit";
import {
  describeEvidenceImage,
  extractTextFromFile,
  removeBackground,
  searchCaseEvidence,
  transcribeAudio,
} from "@/lib/actions/ai-evidence";
import { getCase } from "@/lib/actions/cases";
import { createEvidenceDownloadUrl } from "@/lib/actions/evidence-files";
import {
  createFinding,
  deleteFinding,
  listFindings,
  updateFinding,
  verifyFinding,
} from "@/lib/actions/findings";
import {
  approveReport,
  exportReportPdf,
  exportReportWord,
  generateReport,
  getReport,
  listReports,
  regenerateReport,
  updateReport,
} from "@/lib/actions/reports";
import { createExpense, deleteExpense, listExpenses } from "@/lib/actions/expenses";
import { generateInvoice, generateInvoicePdf, listInvoices } from "@/lib/actions/invoices";
import { createTimeEntry, deleteTimeEntry, listTimeEntries } from "@/lib/actions/time-entries";
import { generatePortalLink, listPortalLinks, revokePortalLink } from "@/lib/actions/portal";
import { ReportToolbar } from "@/components/reports/report-toolbar";
import { ReportViewer } from "@/components/reports/report-viewer";
import { formatCurrencyFromPence } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; evidence_q?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const profile = await getCurrentProfile();
  const [currentCase, findings, reports, portalLinks] = await Promise.all([
    getCase(id),
    listFindings(id),
    listReports(id),
    listPortalLinks(id),
  ]);
  const [{ rows: timeEntries }, { rows: expenses }, invoices] = await Promise.all([
    listTimeEntries(id),
    listExpenses(id),
    listInvoices(),
  ]);
  const caseInvoices = invoices.filter((invoice) => invoice.case_id === id);
  const latestReport = reports[0] ? await getReport(reports[0].id) : null;
  const aiUsage = await getAiUsage(profile.organisation_id);
  const evidenceQuery = query.evidence_q?.trim() ?? "";
  const evidenceResults = (evidenceQuery
    ? await searchCaseEvidence(id, evidenceQuery)
    : []) as Array<{
    source_type: string;
    source_id: string;
    snippet: string;
  }>;

  async function downloadFileAction(formData: FormData) {
    "use server";
    const fileId = String(formData.get("file_id") ?? "");
    if (!fileId) return;
    const url = await createEvidenceDownloadUrl(fileId);
    redirect(url);
  }

  async function generateReportAction(formData: FormData) {
    "use server";
    const reportType = String(formData.get("report_type") ?? "FULL_INVESTIGATION");
    await generateReport(id, reportType as Parameters<typeof generateReport>[1]);
  }

  async function regenerateReportAction(formData: FormData) {
    "use server";
    const reportType = String(formData.get("report_type") ?? "FULL_INVESTIGATION");
    await regenerateReport(id, reportType as Parameters<typeof regenerateReport>[1]);
  }

  async function approveReportAction(formData: FormData) {
    "use server";
    const reportId = String(formData.get("report_id") ?? "");
    if (!reportId) return;
    await approveReport(reportId);
  }

  async function exportPdfAction(formData: FormData) {
    "use server";
    const reportId = String(formData.get("report_id") ?? "");
    if (!reportId) return;
    const url = await exportReportPdf(reportId);
    redirect(url);
  }

  async function exportWordAction(formData: FormData) {
    "use server";
    const reportId = String(formData.get("report_id") ?? "");
    if (!reportId) return;
    const url = await exportReportWord(reportId);
    redirect(url);
  }

  async function updateReportAction(formData: FormData) {
    "use server";
    const reportId = String(formData.get("report_id") ?? "");
    const content = String(formData.get("content") ?? "");
    if (!reportId || !content.trim()) return;
    await updateReport(reportId, content);
  }

  async function generateInvoiceAction(formData: FormData) {
    "use server";
    const startDate = String(formData.get("start_date") ?? "");
    const endDate = String(formData.get("end_date") ?? "");
    await generateInvoice(id, startDate || undefined, endDate || undefined);
  }

  async function exportInvoicePdfAction(formData: FormData) {
    "use server";
    const invoiceId = String(formData.get("invoice_id") ?? "");
    if (!invoiceId) return;
    const url = await generateInvoicePdf(invoiceId);
    redirect(url);
  }

  async function extractTextAction(formData: FormData) {
    "use server";
    const fileId = String(formData.get("file_id") ?? "");
    if (!fileId) return;
    await extractTextFromFile(fileId);
  }

  async function describeImageAction(formData: FormData) {
    "use server";
    const fileId = String(formData.get("file_id") ?? "");
    if (!fileId) return;
    await describeEvidenceImage(fileId);
  }

  async function transcribeAction(formData: FormData) {
    "use server";
    const fileId = String(formData.get("file_id") ?? "");
    if (!fileId) return;
    await transcribeAudio(fileId);
  }

  async function removeBackgroundAction(formData: FormData) {
    "use server";
    const fileId = String(formData.get("file_id") ?? "");
    if (!fileId) return;
    await removeBackground(fileId);
  }

  async function batchOcrAction() {
    "use server";
    const currentFindings = await listFindings(id);
    const files = currentFindings.flatMap((finding) =>
      finding.files.filter(
        (file) =>
          !file.ocr_text &&
          (file.file_type.startsWith("image/") || file.file_type === "application/pdf"),
      ),
    );
    for (const file of files) {
      await extractTextFromFile(file.id);
    }
  }

  async function batchTranscribeAction() {
    "use server";
    const currentFindings = await listFindings(id);
    const files = currentFindings.flatMap((finding) =>
      finding.files.filter(
        (file) =>
          !file.transcription &&
          (file.file_type.startsWith("audio/") || file.file_type.startsWith("video/")),
      ),
    );
    for (const file of files) {
      await transcribeAudio(file.id);
    }
  }

  async function generatePortalAction(formData: FormData) {
    "use server";
    const expiryDays = Number(formData.get("expiry_days") ?? 14);
    await generatePortalLink(id, Number.isFinite(expiryDays) ? expiryDays : 14);
  }

  async function revokePortalAction(formData: FormData) {
    "use server";
    const portalId = String(formData.get("portal_id") ?? "");
    if (!portalId) return;
    await revokePortalLink(portalId);
  }

  const osintSearchTerm = query.q || currentCase.title;
  const encodedTerm = encodeURIComponent(osintSearchTerm);

  return (
    <PageWrapper>
      <Header title={`${currentCase.ref} · ${currentCase.title}`} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge>{currentCase.status}</Badge>
        <Badge>{currentCase.type}</Badge>
        <Badge>Priority: {currentCase.priority}</Badge>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-muted)]">Findings</p>
          <p className="mt-1 text-xl font-semibold">{currentCase.findingsCount}</p>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-muted)]">Time total</p>
          <p className="mt-1 text-xl font-semibold">
            {formatCurrencyFromPence(currentCase.timeTotalPence)}
          </p>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--text-muted)]">Expense total</p>
          <p className="mt-1 text-xl font-semibold">
            {formatCurrencyFromPence(currentCase.expenseTotalPence)}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-2 text-lg font-semibold">Description</h2>
        <p className="text-sm text-[var(--text-muted)]">
          {currentCase.description || "No description provided."}
        </p>
      </section>

      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-lg font-semibold">Reports</h2>
        <form action={generateReportAction} className="mb-3 flex flex-wrap gap-2">
          <select
            name="report_type"
            className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            defaultValue="FULL_INVESTIGATION"
          >
            <option value="FULL_INVESTIGATION">Full Investigation</option>
            <option value="SURVEILLANCE">Surveillance</option>
            <option value="DUE_DILIGENCE">Due Diligence</option>
            <option value="BACKGROUND_CHECK">Background Check</option>
            <option value="OSINT_INTELLIGENCE">OSINT Intelligence</option>
            <option value="INTERIM_UPDATE">Interim Update</option>
            <option value="EXECUTIVE_SUMMARY">Executive Summary</option>
          </select>
          <Button type="submit">Generate report</Button>
        </form>
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          Generating report... this may take 15–30 seconds
        </p>

        {!reports.length ? (
          <p className="text-sm text-[var(--text-muted)]">No reports generated yet.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {reports.map((report) => (
                <Badge key={report.id}>
                  v{report.version} · {report.status}
                </Badge>
              ))}
            </div>

            {latestReport ? (
              <div className="space-y-3">
                <ReportToolbar />
                <div className="flex flex-wrap gap-2">
                  <form action={regenerateReportAction}>
                    <input type="hidden" name="report_type" value={latestReport.report_type} />
                    <Button type="submit">Regenerate</Button>
                  </form>
                  <form action={approveReportAction}>
                    <input type="hidden" name="report_id" value={latestReport.id} />
                    <Button type="submit" variant="ghost">
                      Approve
                    </Button>
                  </form>
                  <form action={exportPdfAction}>
                    <input type="hidden" name="report_id" value={latestReport.id} />
                    <Button type="submit" variant="ghost">
                      Export PDF
                    </Button>
                  </form>
                  <form action={exportWordAction}>
                    <input type="hidden" name="report_id" value={latestReport.id} />
                    <Button type="submit" variant="ghost">
                      Export Word
                    </Button>
                  </form>
                </div>
                <ReportViewer markdown={latestReport.content} />
                <form action={updateReportAction} className="space-y-2">
                  <input type="hidden" name="report_id" value={latestReport.id} />
                  <textarea
                    name="content"
                    defaultValue={latestReport.content}
                    rows={12}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
                  />
                  <Button type="submit" variant="ghost">
                    Save edited report
                  </Button>
                </form>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-lg font-semibold">Client Portal</h2>
        <form action={generatePortalAction} className="mb-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">Expiry (days)</label>
            <Input name="expiry_days" type="number" defaultValue="14" />
          </div>
          <Button type="submit">Share with Client</Button>
        </form>
        {!portalLinks.length ? (
          <p className="text-xs text-[var(--text-muted)]">No active portal links.</p>
        ) : (
          <ul className="space-y-2">
            {portalLinks.map((link) => (
              <li
                key={link.id}
                className="flex items-center justify-between rounded border border-[var(--border)] px-3 py-2 text-xs"
              >
                <span className="mono">
                  /portal/{link.token} · expires {new Date(link.expires_at).toLocaleDateString("en-GB")}
                </span>
                {link.revoked_at ? (
                  <Badge>Revoked</Badge>
                ) : (
                  <form action={revokePortalAction}>
                    <input type="hidden" name="portal_id" value={link.id} />
                    <Button type="submit" variant="danger">
                      Revoke
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-lg font-semibold">AI Tools</h2>
        <p className="mb-3 text-sm text-[var(--text-muted)]">
          Credits: {aiUsage.used}/{Number.isFinite(aiUsage.limit) ? aiUsage.limit : "∞"} this month
        </p>
        <div className="mb-4 h-2 rounded bg-[var(--surface-light)]">
          <div
            className="h-2 rounded bg-[var(--accent)]"
            style={{
              width: `${
                Number.isFinite(aiUsage.limit) && aiUsage.limit > 0
                  ? Math.min(100, Math.round((aiUsage.used / aiUsage.limit) * 100))
                  : 0
              }%`,
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={batchOcrAction}>
            <Button type="submit" variant="ghost">
              Batch OCR
            </Button>
          </form>
          <form action={batchTranscribeAction}>
            <Button type="submit" variant="ghost">
              Batch Transcribe
            </Button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-lg font-semibold">OSINT Tools</h2>
        <form className="mb-3 flex gap-2">
          <Input name="q" defaultValue={osintSearchTerm} placeholder="Search term" />
          <Button type="submit" variant="ghost">
            Update
          </Button>
        </form>
        <div className="grid gap-2 md:grid-cols-2">
          <a className="rounded border border-[var(--border)] px-3 py-2 text-xs" href={`https://find-and-update.company-information.service.gov.uk/search?q=${encodedTerm}`} target="_blank" rel="noreferrer">Companies House</a>
          <a className="rounded border border-[var(--border)] px-3 py-2 text-xs" href="https://search-property-information.service.gov.uk/" target="_blank" rel="noreferrer">Land Registry</a>
          <a className="rounded border border-[var(--border)] px-3 py-2 text-xs" href="https://www.192.com/" target="_blank" rel="noreferrer">Electoral Roll</a>
          <a className="rounded border border-[var(--border)] px-3 py-2 text-xs" href="https://www.courtserve.net/" target="_blank" rel="noreferrer">Court records</a>
          <a className="rounded border border-[var(--border)] px-3 py-2 text-xs" href="https://www.thegazette.co.uk/" target="_blank" rel="noreferrer">Gazette</a>
          <a className="rounded border border-[var(--border)] px-3 py-2 text-xs" href={`https://www.linkedin.com/search/results/people/?keywords=${encodedTerm}`} target="_blank" rel="noreferrer">LinkedIn</a>
          <a className="rounded border border-[var(--border)] px-3 py-2 text-xs" href={`https://www.facebook.com/search/people/?q=${encodedTerm}`} target="_blank" rel="noreferrer">Facebook</a>
          <a className="rounded border border-[var(--border)] px-3 py-2 text-xs" href={`https://www.google.co.uk/search?q=${encodedTerm}`} target="_blank" rel="noreferrer">Google</a>
        </div>
      </section>

      <section id="add-finding" className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-lg font-semibold">Add Finding</h2>
        <form action={createFinding} encType="multipart/form-data" className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="case_id" value={id} />
          <Input name="type" defaultValue="OBSERVATION" placeholder="Type" />
          <Input name="source" placeholder="Source" defaultValue="Manual entry" />
          <Input name="timestamp" type="datetime-local" />
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input name="client_visible" type="checkbox" />
            Client visible
          </label>
          <Input name="content" placeholder="Finding content" className="md:col-span-2" />
          <input
            name="files"
            type="file"
            multiple
            className="md:col-span-2 text-sm text-[var(--text-muted)]"
          />
          <div className="md:col-span-2">
            <Button type="submit">Save Finding</Button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-lg font-semibold">Time Entries</h2>
        <form action={createTimeEntry} className="mb-4 grid gap-2 md:grid-cols-5">
          <input type="hidden" name="case_id" value={id} />
          <Input name="date" type="date" required />
          <Input name="hours" type="number" step="0.25" placeholder="Hours" required />
          <Input name="rate" type="number" placeholder="Rate (pence/hour)" defaultValue={String(currentCase.rate ?? 500)} />
          <Input name="description" placeholder="Description" className="md:col-span-2" />
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] md:col-span-5">
            <input name="billable" type="checkbox" defaultChecked />
            Billable
          </label>
          <Button type="submit" className="md:col-span-5">
            Log Time
          </Button>
        </form>

        {!timeEntries.length ? (
          <p className="text-xs text-[var(--text-muted)]">No time entries yet.</p>
        ) : (
          <ul className="space-y-2">
            {timeEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded border border-[var(--border)] px-3 py-2 text-xs"
              >
                <span>
                  {new Date(entry.date).toLocaleDateString("en-GB")} · {entry.hours}h · {entry.description}
                </span>
                <form action={deleteTimeEntry.bind(null, entry.id)}>
                  <Button type="submit" variant="danger">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-lg font-semibold">Expenses</h2>
        <form action={createExpense} encType="multipart/form-data" className="mb-4 grid gap-2 md:grid-cols-5">
          <input type="hidden" name="case_id" value={id} />
          <Input name="date" type="date" required />
          <Input name="amount" type="number" placeholder="Amount (pence)" required />
          <Input name="category" placeholder="Category" defaultValue="OTHER" />
          <Input name="description" placeholder="Description" className="md:col-span-2" required />
          <input name="receipt" type="file" className="text-xs text-[var(--text-muted)] md:col-span-5" />
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] md:col-span-5">
            <input name="billable" type="checkbox" defaultChecked />
            Billable
          </label>
          <Button type="submit" className="md:col-span-5">
            Log Expense
          </Button>
        </form>

        {!expenses.length ? (
          <p className="text-xs text-[var(--text-muted)]">No expenses yet.</p>
        ) : (
          <ul className="space-y-2">
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex items-center justify-between rounded border border-[var(--border)] px-3 py-2 text-xs"
              >
                <span>
                  {new Date(expense.date).toLocaleDateString("en-GB")} · {expense.description} ·{" "}
                  {formatCurrencyFromPence(Number(expense.amount))}
                </span>
                <form action={deleteExpense.bind(null, expense.id)}>
                  <Button type="submit" variant="danger">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-lg font-semibold">Invoices</h2>
        <form action={generateInvoiceAction} className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">From</label>
            <Input name="start_date" type="date" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">To</label>
            <Input name="end_date" type="date" />
          </div>
          <Button type="submit">Generate Invoice</Button>
        </form>

        {!caseInvoices.length ? (
          <p className="text-xs text-[var(--text-muted)]">No invoices yet for this case.</p>
        ) : (
          <ul className="space-y-2">
            {caseInvoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex items-center justify-between rounded border border-[var(--border)] px-3 py-2 text-xs"
              >
                <span>
                  {invoice.invoice_number} · {invoice.status} ·{" "}
                  {formatCurrencyFromPence(Math.round(Number(invoice.total)))}
                </span>
                <form action={exportInvoicePdfAction}>
                  <input type="hidden" name="invoice_id" value={invoice.id} />
                  <Button type="submit" variant="ghost">
                    PDF
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Findings Timeline</h2>
        <form className="mb-3 flex gap-2">
          <Input
            name="evidence_q"
            defaultValue={evidenceQuery}
            placeholder="Search findings, OCR, transcription, and AI descriptions"
          />
          <Button type="submit" variant="ghost">
            Search
          </Button>
        </form>
        {evidenceQuery ? (
          <div className="mb-4 rounded border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="mb-2 text-xs text-[var(--text-muted)]">
              Evidence search results for: <span className="mono">{evidenceQuery}</span>
            </p>
            {!evidenceResults.length ? (
              <p className="text-xs text-[var(--text-muted)]">No matches found.</p>
            ) : (
              <ul className="space-y-1">
                {evidenceResults.map((result, index) => (
                  <li key={`${result.source_type}-${result.source_id}-${index}`} className="text-xs">
                    <span className="mono text-[var(--accent)]">{result.source_type}</span> · {result.snippet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
        {!findings.length ? (
          <p className="text-sm text-[var(--text-muted)]">
            No evidence recorded — add your first finding.
          </p>
        ) : (
          <div className="space-y-4 border-l-2 border-[var(--accent)] pl-4">
            {findings.map((finding) => (
              <article
                key={finding.id}
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="mono text-xs text-[var(--accent)]">{finding.evidence_ref}</span>
                  <Badge>{finding.type}</Badge>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(finding.timestamp).toLocaleString("en-GB")}
                  </span>
                  {finding.is_verified ? <Badge className="border-[var(--accent)]">Verified</Badge> : null}
                </div>
                <p className="text-sm text-[var(--text)]">{finding.content}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Source: {finding.source}</p>

                {finding.files.length ? (
                  <ul className="mt-3 space-y-2">
                    {finding.files.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center justify-between rounded border border-[var(--border)] px-3 py-2"
                      >
                        <span className="text-xs text-[var(--text-muted)]">
                          {file.file_name} ({Math.max(1, Math.round(file.file_size / 1024))}KB)
                        </span>
                        <form action={downloadFileAction}>
                          <input type="hidden" name="file_id" value={file.id} />
                          <Button variant="ghost" type="submit">
                            Download
                          </Button>
                        </form>
                        {(file.file_type.startsWith("image/") || file.file_type === "application/pdf") && (
                          <form action={extractTextAction}>
                            <input type="hidden" name="file_id" value={file.id} />
                            <Button variant="ghost" type="submit">
                              Extract Text (AI)
                            </Button>
                          </form>
                        )}
                        {file.file_type.startsWith("image/") && (
                          <>
                            <form action={describeImageAction}>
                              <input type="hidden" name="file_id" value={file.id} />
                              <Button variant="ghost" type="submit">
                                Describe Image (AI)
                              </Button>
                            </form>
                            <form action={removeBackgroundAction}>
                              <input type="hidden" name="file_id" value={file.id} />
                              <Button variant="ghost" type="submit">
                                Remove Background (AI)
                              </Button>
                            </form>
                          </>
                        )}
                        {(file.file_type.startsWith("audio/") || file.file_type.startsWith("video/")) && (
                          <form action={transcribeAction}>
                            <input type="hidden" name="file_id" value={file.id} />
                            <Button variant="ghost" type="submit">
                              Transcribe (AI)
                            </Button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {finding.files.map((file) => (
                  <div key={`${file.id}-ai`} className="mt-2 rounded border border-[var(--border)] p-2 text-xs">
                    {file.ocr_text ? <p><strong>OCR:</strong> {file.ocr_text}</p> : null}
                    {file.ai_description ? <p><strong>Image description:</strong> {file.ai_description}</p> : null}
                    {file.transcription ? <p><strong>Transcription:</strong> {file.transcription}</p> : null}
                  </div>
                ))}

                <div className="mt-3 flex flex-wrap gap-2">
                  {!finding.is_verified ? (
                    <form action={verifyFinding.bind(null, finding.id)}>
                      <Button type="submit" variant="ghost">
                        Verify
                      </Button>
                    </form>
                  ) : null}
                  <form action={deleteFinding.bind(null, finding.id)}>
                    <Button type="submit" variant="danger">
                      Delete
                    </Button>
                  </form>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-[var(--text-muted)]">
                    Edit content/source
                  </summary>
                  <form action={updateFinding.bind(null, finding.id)} className="mt-2 grid gap-2 md:grid-cols-2">
                    <Input name="source" defaultValue={finding.source} />
                    <Input name="content" defaultValue={finding.content} className="md:col-span-2" />
                    <div className="md:col-span-2">
                      <Button type="submit" variant="ghost">
                        Save changes
                      </Button>
                    </div>
                  </form>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageWrapper>
  );
}
