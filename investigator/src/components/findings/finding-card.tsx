export function FindingCard({ content }: { content: string }) {
  return (
    <div className="mb-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text)]">
      {content}
    </div>
  );
}
