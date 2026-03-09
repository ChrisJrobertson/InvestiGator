import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-center justify-between text-sm text-[var(--text-muted)]">
        <span>{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-semibold text-[var(--text)]">{value}</div>
    </div>
  );
}
