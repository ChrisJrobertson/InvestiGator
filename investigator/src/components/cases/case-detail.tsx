import type { ReactNode } from "react";

export function CaseDetail({ children }: { children: ReactNode }) {
  return <section className="space-y-4">{children}</section>;
}
