export function ClientCard({ name }: { name: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text)]">
      {name}
    </div>
  );
}
