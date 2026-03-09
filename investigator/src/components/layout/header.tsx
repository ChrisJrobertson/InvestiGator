export function Header({ title }: { title: string }) {
  return (
    <header className="mb-6 border-b border-[var(--border)] pb-4">
      <h1 className="text-2xl font-semibold text-[var(--text)]">{title}</h1>
    </header>
  );
}
