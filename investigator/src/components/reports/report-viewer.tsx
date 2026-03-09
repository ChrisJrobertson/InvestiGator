export function ReportViewer({ markdown }: { markdown: string }) {
  return (
    <article className="prose prose-invert max-w-none rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
      <pre className="whitespace-pre-wrap text-sm text-[var(--text)]">{markdown}</pre>
    </article>
  );
}
