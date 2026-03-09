import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("id, title, report_type, status, created_at, cases(ref, title)")
    .order("created_at", { ascending: false });

  return (
    <>
      <Header
        title="Reports"
        description="AI-generated investigation reports"
      />

      {(reports ?? []).length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Reports are generated from case findings using AI. Open a case to create your first report."
        />
      ) : (
        <div className="space-y-3">
          {(reports ?? []).map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
            >
              <div>
                <h3 className="text-sm font-medium text-text">{r.title}</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {(r.cases as unknown as { ref: string })?.ref} · {formatDate(r.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge>{r.report_type}</Badge>
                <Badge>{r.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
