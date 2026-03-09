"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NAV_ITEMS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SidebarProps = {
  userName: string;
  userEmail: string;
  aiUsed: number;
  aiLimit: number;
};

export function Sidebar({ userName, userEmail, aiUsed, aiLimit }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const progress = useMemo(() => {
    if (!Number.isFinite(aiLimit) || aiLimit <= 0) return 0;
    return Math.min(100, Math.round((aiUsed / aiLimit) * 100));
  }, [aiLimit, aiUsed]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] md:hidden"
        onClick={() => setOpen((value) => !value)}
      >
        Menu
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[220px] border-r border-[var(--border)] bg-[var(--surface)] p-4 transition-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        )}
      >
        <div className="mb-6 flex items-center gap-2">
          <div className="rounded bg-[var(--accent)] px-2 py-1 text-sm font-bold text-[#04251e]">
            iG
          </div>
          <span className="text-sm font-semibold text-[var(--text)]">InvestiGator</span>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm",
                  isActive
                    ? "bg-[var(--surface-light)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-light)] hover:text-[var(--text)]",
                )}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3">
          <p className="text-xs text-[var(--text-muted)]">
            AI Credits: {aiUsed}/{Number.isFinite(aiLimit) ? aiLimit : "∞"}
          </p>
          <div className="mt-2 h-2 w-full rounded bg-[var(--surface-light)]">
            <div
              className="h-2 rounded bg-[var(--accent)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="absolute right-4 bottom-4 left-4">
          <p className="text-sm font-medium text-[var(--text)]">{userName}</p>
          <p className="mb-3 text-xs text-[var(--text-muted)]">{userEmail}</p>
          <Button className="w-full" variant="ghost" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </aside>
    </>
  );
}
