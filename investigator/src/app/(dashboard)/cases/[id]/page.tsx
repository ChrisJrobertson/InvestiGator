import { Header } from "@/components/layout/header";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCase } from "@/lib/actions/cases";
import { createEvidenceDownloadUrl } from "@/lib/actions/evidence-files";
import {
  createFinding,
  deleteFinding,
  listFindings,
  updateFinding,
  verifyFinding,
} from "@/lib/actions/findings";
import { formatCurrencyFromPence } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [currentCase, findings] = await Promise.all([getCase(id), listFindings(id)]);

  async function downloadFileAction(formData: FormData) {
    "use server";
    const fileId = String(formData.get("file_id") ?? "");
    if (!fileId) return;
    const url = await createEvidenceDownloadUrl(fileId);
    redirect(url);
  }

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

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Findings Timeline</h2>
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
                      </li>
                    ))}
                  </ul>
                ) : null}

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
