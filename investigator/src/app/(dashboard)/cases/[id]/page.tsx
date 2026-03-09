import { getCase } from "@/lib/actions/cases";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { formatDate, formatCurrency, formatHours } from "@/lib/utils";
import { Search, Clock, DollarSign, FileText } from "lucide-react";
import { CaseDetailClient } from "./CaseDetailClient";

const statusVariant = (s: string) => {
  switch (s) {
    case "OPEN": return "accent" as const;
    case "IN_PROGRESS": return "warning" as const;
    case "REVIEW": return "info" as const;
    default: return "default" as const;
  }
};

const priorityVariant = (p: string) => {
  switch (p) {
    case "CRITICAL": return "danger" as const;
    case "HIGH": return "warning" as const;
    default: return "default" as const;
  }
};

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseData = await getCase(id);

  const client = caseData.clients as unknown as {
    id: string;
    name: string;
    email: string;
    contact_person: string;
  } | null;

  const investigator = caseData.profiles as unknown as {
    id: string;
    name: string;
    email: string;
  } | null;

  return (
    <>
      <Header
        title={caseData.title}
        description={
          <span className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-accent">{caseData.ref}</span>
            <Badge variant={statusVariant(caseData.status)}>
              {caseData.status.replace("_", " ")}
            </Badge>
            <Badge variant={priorityVariant(caseData.priority)}>
              {caseData.priority}
            </Badge>
          </span>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Findings"
          value={caseData.stats.findings_count}
          icon={Search}
        />
        <StatCard
          title="Hours Logged"
          value={formatHours(caseData.stats.total_hours)}
          icon={Clock}
        />
        <StatCard
          title="Total Cost"
          value={formatCurrency(caseData.stats.total_cost)}
          icon={DollarSign}
        />
        <StatCard
          title="Reports"
          value={caseData.reports.length}
          icon={FileText}
        />
      </div>

      {/* Case info row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-medium text-text-muted mb-2">Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Opened</span>
              <span className="text-text">{formatDate(caseData.opened_at)}</span>
            </div>
            {caseData.due_date && (
              <div className="flex justify-between">
                <span className="text-text-muted">Due</span>
                <span className="text-text">{formatDate(caseData.due_date)}</span>
              </div>
            )}
            {caseData.closed_at && (
              <div className="flex justify-between">
                <span className="text-text-muted">Closed</span>
                <span className="text-text">{formatDate(caseData.closed_at)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-medium text-text-muted mb-2">Client</h3>
          {client ? (
            <div className="text-sm">
              <p className="text-text font-medium">{client.name}</p>
              {client.contact_person && (
                <p className="text-text-muted">{client.contact_person}</p>
              )}
              {client.email && (
                <p className="text-text-muted">{client.email}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No client assigned</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-medium text-text-muted mb-2">
            Investigator
          </h3>
          {investigator ? (
            <div className="text-sm">
              <p className="text-text font-medium">{investigator.name}</p>
              <p className="text-text-muted">{investigator.email}</p>
            </div>
          ) : (
            <p className="text-sm text-text-muted">Unassigned</p>
          )}
        </div>
      </div>

      {caseData.description && (
        <div className="rounded-xl border border-border bg-surface p-4 mb-6">
          <h3 className="text-sm font-medium text-text-muted mb-2">Description</h3>
          <p className="text-sm text-text whitespace-pre-wrap">{caseData.description}</p>
        </div>
      )}

      {/* Tabbed sections */}
      <CaseDetailClient
        caseId={id}
        caseStatus={caseData.status}
        findings={caseData.findings}
        timeEntries={caseData.time_entries}
        expenses={caseData.expenses}
        reports={caseData.reports}
      />
    </>
  );
}
