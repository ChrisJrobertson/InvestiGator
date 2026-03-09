import { getPortalData } from "@/lib/actions/portal";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  try {
    const data = await getPortalData(token);
    const supabaseAdmin = getSupabaseAdmin();
    const portalCase = (data.case ?? null) as {
      ref: string;
      title: string;
      status: string;
    } | null;
    const portalClient = (data.client ?? null) as { name: string } | null;
    const portalFindings = (data.findings ?? []) as Array<{
      id: string;
      evidence_ref: string;
      type: string;
      content: string;
      timestamp: string;
    }>;
    const portalReports = (data.reports ?? []) as Array<{
      id: string;
      title: string;
      pdf_storage_path: string | null;
      word_storage_path: string | null;
    }>;

    const reportDownloads = await Promise.all(
      portalReports.map(async (report) => {
        const pdfUrl = report.pdf_storage_path
          ? (
              await supabaseAdmin.storage
                .from("evidence")
                .createSignedUrl(report.pdf_storage_path, 3600)
            ).data?.signedUrl ?? null
          : null;

        const wordUrl = report.word_storage_path
          ? (
              await supabaseAdmin.storage
                .from("evidence")
                .createSignedUrl(report.word_storage_path, 3600)
            ).data?.signedUrl ?? null
          : null;

        return { ...report, pdfUrl, wordUrl };
      }),
    );

    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Client Portal</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {portalCase?.ref} · {portalCase?.title} · {portalCase?.status}
        </p>
        {portalClient ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">Client: {portalClient.name}</p>
        ) : null}

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Findings timeline</h2>
          {!portalFindings.length ? (
            <p className="text-sm text-[var(--text-muted)]">No client-visible findings yet.</p>
          ) : (
            <ul className="space-y-3 border-l-2 border-[var(--accent)] pl-4">
              {portalFindings.map((finding) => (
                <li key={finding.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                  <p className="mono text-xs text-[var(--accent)]">{finding.evidence_ref}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(finding.timestamp).toLocaleString("en-GB")} · {finding.type}
                  </p>
                  <p className="mt-1 text-sm">{finding.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Reports</h2>
          {!reportDownloads.length ? (
            <p className="text-sm text-[var(--text-muted)]">No delivered reports yet.</p>
          ) : (
            <ul className="space-y-2">
              {reportDownloads.map((report) => (
                <li key={report.id} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
                  <p className="text-sm font-medium">{report.title}</p>
                  <div className="mt-2 flex gap-2">
                    {report.pdfUrl ? (
                      <a
                        href={report.pdfUrl}
                        className="rounded border border-[var(--border)] px-3 py-1 text-xs"
                      >
                        Download PDF
                      </a>
                    ) : null}
                    {report.wordUrl ? (
                      <a
                        href={report.wordUrl}
                        className="rounded border border-[var(--border)] px-3 py-1 text-xs"
                      >
                        Download Word
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    );
  } catch {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Client Portal</h1>
        <p className="mt-2 text-sm text-[var(--danger)]">This portal link is invalid, expired, or revoked.</p>
      </main>
    );
  }
}
