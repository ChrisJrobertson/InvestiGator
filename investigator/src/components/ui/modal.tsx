import type { ReactNode } from "react";

export function Modal({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="mb-3 text-base font-semibold text-[var(--text)]">{title}</h3>
      {children}
    </div>
  );
}
