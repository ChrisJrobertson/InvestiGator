import type { ReactNode } from "react";

export function FindingTimeline({ children }: { children: ReactNode }) {
  return <div className="border-l-2 border-[var(--accent)] pl-4">{children}</div>;
}
