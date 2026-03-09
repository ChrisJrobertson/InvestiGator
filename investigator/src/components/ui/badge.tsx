import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-light)] px-2 py-0.5 text-xs text-[var(--text)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
