export function CaseCard({ title, ref }: { title: string; ref: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="font-mono text-xs text-[var(--accent)]">{ref}</p>
      <p className="mt-1 text-sm text-[var(--text)]">{title}</p>
    </div>
  );
}
