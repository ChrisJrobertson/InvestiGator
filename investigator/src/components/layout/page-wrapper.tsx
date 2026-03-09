import type { ReactNode } from "react";

export function PageWrapper({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</div>;
}
