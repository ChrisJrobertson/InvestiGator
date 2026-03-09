"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { updateCaseStatus, deleteCase } from "@/lib/actions/cases";
import { createFinding } from "@/lib/actions/findings";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { CASE_STATUSES, FINDING_TYPES, FINDING_SEVERITIES } from "@/lib/constants";
import { formatDate, formatCurrency, formatHours } from "@/lib/utils";
import {
  Search,
  Clock,
  Receipt,
  FileText,
  Plus,
  Trash2,
  ChevronRight,
} from "lucide-react";

interface Finding {
  id: string;
  evidence_ref: string;
  title: string;
  finding_type: string;
  severity: string;
  status: string;
  found_at: string;
}

interface TimeEntry {
  id: string;
  description: string;
  hours: number;
  rate: number | null;
  date: string;
  billable: boolean;
  profiles: { name: string } | null;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  billable: boolean;
  profiles: { name: string } | null;
}

interface Report {
  id: string;
  title: string;
  report_type: string;
  status: string;
  created_at: string;
}

interface Props {
  caseId: string;
  caseStatus: string;
  findings: Finding[];
  timeEntries: TimeEntry[];
  expenses: Expense[];
  reports: Report[];
}

type Tab = "findings" | "time" | "expenses" | "reports";

const severityVariant = (s: string) => {
  switch (s) {
    case "CRITICAL": return "danger" as const;
    case "HIGH": return "warning" as const;
    case "MEDIUM": return "warning" as const;
    default: return "default" as const;
  }
};

export function CaseDetailClient({
  caseId,
  caseStatus,
  findings,
  timeEntries,
  expenses,
  reports,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("findings");
  const [newFindingOpen, setNewFindingOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [findingForm, setFindingForm] = useState({
    title: "",
    description: "",
    finding_type: "OBSERVATION",
    severity: "INFO",
    location: "",
  });

  const handleStatusChange = (status: string) => {
    startTransition(async () => {
      try {
        await updateCaseStatus(caseId, status);
        toast("success", `Status changed to ${status}`);
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleAddFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createFinding(caseId, findingForm);
        toast("success", "Finding added");
        setNewFindingOpen(false);
        setFindingForm({
          title: "",
          description: "",
          finding_type: "OBSERVATION",
          severity: "INFO",
          location: "",
        });
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleDeleteCase = () => {
    startTransition(async () => {
      try {
        await deleteCase(caseId);
        toast("success", "Case deleted");
        router.push("/cases");
      } catch (err) {
        toast("error", (err as Error).message);
        setDeleteOpen(false);
      }
    });
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "findings", label: "Findings", icon: Search, count: findings.length },
    { key: "time", label: "Time", icon: Clock, count: timeEntries.length },
    { key: "expenses", label: "Expenses", icon: Receipt, count: expenses.length },
    { key: "reports", label: "Reports", icon: FileText, count: reports.length },
  ];

  return (
    <>
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-text-muted mr-1">Status:</span>
        {CASE_STATUSES.map((s) => (
          <Button
            key={s}
            variant={caseStatus === s ? "primary" : "secondary"}
            size="sm"
            onClick={() => handleStatusChange(s)}
            disabled={isPending}
          >
            {s.replace("_", " ")}
          </Button>
        ))}
        <div className="flex-1" />
        <Button
          variant="danger"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-4">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                tab === t.key
                  ? "border-accent text-accent"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              <span className="rounded-full bg-surface-light px-2 py-0.5 text-xs">
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === "findings" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setNewFindingOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Finding
            </Button>
          </div>
          {findings.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">
              No findings recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {findings.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-accent">
                        {f.evidence_ref}
                      </span>
                      <Badge>{f.finding_type}</Badge>
                      <Badge variant={severityVariant(f.severity)}>
                        {f.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-text truncate">{f.title}</p>
                    <p className="text-xs text-text-muted">
                      {formatDate(f.found_at)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "time" && (
        <div>
          {timeEntries.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">
              No time entries yet.
            </p>
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">By</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Hours</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {timeEntries.map((t) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 text-sm text-text">{formatDate(t.date)}</td>
                      <td className="px-4 py-3 text-sm text-text">{t.description}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {(t.profiles as unknown as { name: string })?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-text text-right font-mono">
                        {formatHours(Number(t.hours))}
                      </td>
                      <td className="px-4 py-3 text-sm text-text text-right font-mono">
                        {t.rate
                          ? formatCurrency(Number(t.hours) * Number(t.rate))
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "expenses" && (
        <div>
          {expenses.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">
              No expenses yet.
            </p>
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">By</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.map((ex) => (
                    <tr key={ex.id}>
                      <td className="px-4 py-3 text-sm text-text">{formatDate(ex.date)}</td>
                      <td className="px-4 py-3 text-sm text-text">{ex.description}</td>
                      <td className="px-4 py-3 text-sm"><Badge>{ex.category}</Badge></td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {(ex.profiles as unknown as { name: string })?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-text text-right font-mono">
                        {formatCurrency(Number(ex.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "reports" && (
        <div>
          {reports.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">
              No reports generated yet.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-text">{r.title}</p>
                    <p className="text-xs text-text-muted">
                      {formatDate(r.created_at)}
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
        </div>
      )}

      {/* New Finding Modal */}
      <Modal
        open={newFindingOpen}
        onClose={() => setNewFindingOpen(false)}
        title="Add Finding"
      >
        <form onSubmit={handleAddFinding} className="space-y-4">
          <Input
            id="finding_title"
            label="Title"
            value={findingForm.title}
            onChange={(e) =>
              setFindingForm({ ...findingForm, title: e.target.value })
            }
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-muted">
              Description
            </label>
            <textarea
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[80px]"
              value={findingForm.description}
              onChange={(e) =>
                setFindingForm({
                  ...findingForm,
                  description: e.target.value,
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-muted">
                Type
              </label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                value={findingForm.finding_type}
                onChange={(e) =>
                  setFindingForm({
                    ...findingForm,
                    finding_type: e.target.value,
                  })
                }
              >
                {FINDING_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-muted">
                Severity
              </label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                value={findingForm.severity}
                onChange={(e) =>
                  setFindingForm({
                    ...findingForm,
                    severity: e.target.value,
                  })
                }
              >
                {FINDING_SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <Input
            id="location"
            label="Location"
            value={findingForm.location}
            onChange={(e) =>
              setFindingForm({ ...findingForm, location: e.target.value })
            }
          />
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setNewFindingOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={isPending} className="flex-1">
              Add Finding
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Case Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Case"
      >
        <p className="text-sm text-text-muted mb-4">
          Are you sure you want to delete this case? This will also delete all
          findings, time entries, and expenses. This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setDeleteOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteCase}
            loading={isPending}
            className="flex-1"
          >
            Delete Case
          </Button>
        </div>
      </Modal>
    </>
  );
}
