"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { updateCaseStatus, deleteCase } from "@/lib/actions/cases";
import { createFinding, updateFinding, deleteFinding, verifyFinding } from "@/lib/actions/findings";
import { uploadEvidenceFile, getSignedUrl, deleteEvidenceFile } from "@/lib/actions/evidence-files";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { CASE_STATUSES, FINDING_TYPES, FINDING_SEVERITIES } from "@/lib/constants";
import { formatDate, formatDateTime, formatCurrency, formatHours } from "@/lib/utils";
import {
  Search,
  Clock,
  Receipt,
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  Paperclip,
  Download,
  Upload,
  X,
  Pencil,
  Shield,
} from "lucide-react";

interface EvidenceFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  hash_sha256: string | null;
  uploaded_at: string;
}

interface Finding {
  id: string;
  evidence_ref: string;
  title: string;
  description: string | null;
  finding_type: string;
  severity: string;
  status: string;
  found_at: string;
  found_by: string | null;
  location: string | null;
  profiles: { name: string } | { name: string }[] | null;
  evidence_files: EvidenceFile[];
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getProfileName(p: { name: string } | { name: string }[] | null): string {
  if (!p) return "Unknown";
  if (Array.isArray(p)) return p[0]?.name ?? "Unknown";
  return p.name;
}

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
  const [editFinding, setEditFinding] = useState<Finding | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFindingTarget, setDeleteFindingTarget] = useState<Finding | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Finding | null>(null);

  const [findingForm, setFindingForm] = useState({
    title: "",
    description: "",
    finding_type: "OBSERVATION",
    severity: "INFO",
    location: "",
    found_at: new Date().toISOString().slice(0, 16),
  });

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);

  const resetFindingForm = () => {
    setFindingForm({
      title: "",
      description: "",
      finding_type: "OBSERVATION",
      severity: "INFO",
      location: "",
      found_at: new Date().toISOString().slice(0, 16),
    });
    setPendingFiles([]);
  };

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
        const finding = await createFinding(caseId, {
          ...findingForm,
          found_at: findingForm.found_at ? new Date(findingForm.found_at).toISOString() : undefined,
        });

        if (pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            const fd = new FormData();
            fd.append("file", file);
            await uploadEvidenceFile(finding.id, caseId, fd);
          }
          toast("success", `Finding added with ${pendingFiles.length} file(s)`);
        } else {
          toast("success", "Finding added");
        }

        setNewFindingOpen(false);
        resetFindingForm();
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleEditFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFinding) return;
    startTransition(async () => {
      try {
        await updateFinding(editFinding.id, {
          title: findingForm.title,
          description: findingForm.description,
          severity: findingForm.severity,
          location: findingForm.location,
        });
        toast("success", "Finding updated");
        setEditFinding(null);
        resetFindingForm();
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleDeleteFinding = () => {
    if (!deleteFindingTarget) return;
    startTransition(async () => {
      try {
        await deleteFinding(deleteFindingTarget.id);
        toast("success", "Finding deleted");
        setDeleteFindingTarget(null);
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleVerify = (findingId: string) => {
    startTransition(async () => {
      try {
        await verifyFinding(findingId);
        toast("success", "Finding verified");
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleFileUpload = (findingId: string) => {
    const target = findings.find((f) => f.id === findingId) ?? null;
    setUploadTarget(target);
  };

  const handleUploadFiles = (files: FileList | null) => {
    if (!files || !uploadTarget) return;
    startTransition(async () => {
      try {
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append("file", file);
          await uploadEvidenceFile(uploadTarget.id, caseId, fd);
        }
        toast("success", `${files.length} file(s) uploaded`);
        setUploadTarget(null);
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleDownload = (fileId: string) => {
    startTransition(async () => {
      try {
        const { url, fileName } = await getSignedUrl(fileId, caseId);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.target = "_blank";
        a.click();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleDeleteFile = (fileId: string) => {
    startTransition(async () => {
      try {
        await deleteEvidenceFile(fileId, caseId);
        toast("success", "File removed");
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

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "findings", label: "Findings", icon: Search, count: findings.length },
    { key: "time", label: "Time", icon: Clock, count: timeEntries.length },
    { key: "expenses", label: "Expenses", icon: Receipt, count: expenses.length },
    { key: "reports", label: "Reports", icon: FileText, count: reports.length },
  ];

  return (
    <>
      {/* Status bar */}
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
        <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
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
              <span className="rounded-full bg-surface-light px-2 py-0.5 text-xs">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========== FINDINGS TIMELINE ========== */}
      {tab === "findings" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => { resetFindingForm(); setNewFindingOpen(true); }}>
              <Plus className="h-4 w-4" />
              Add Finding
            </Button>
          </div>
          {findings.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No findings recorded yet.</p>
          ) : (
            <div className="relative space-y-4 pl-6 before:absolute before:left-[9px] before:top-3 before:bottom-3 before:w-0.5 before:bg-accent/30">
              {findings.map((f) => (
                <div key={f.id} className="relative">
                  {/* Timeline dot */}
                  <div className={`absolute -left-6 top-4 h-3 w-3 rounded-full border-2 border-bg ${
                    f.status === "CONFIRMED" ? "bg-accent" : "bg-surface-light"
                  }`} />

                  <div className="rounded-xl border border-border bg-surface p-4 hover:border-border/80 transition-colors">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-accent font-medium">{f.evidence_ref}</span>
                        <Badge>{f.finding_type}</Badge>
                        <Badge variant={severityVariant(f.severity)}>{f.severity}</Badge>
                        {f.status === "CONFIRMED" && (
                          <Badge variant="accent">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {f.status !== "CONFIRMED" && (
                          <button
                            onClick={() => handleVerify(f.id)}
                            className="rounded-md p-1.5 text-text-muted hover:text-accent transition-colors cursor-pointer"
                            title="Verify finding"
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleFileUpload(f.id)}
                          className="rounded-md p-1.5 text-text-muted hover:text-accent transition-colors cursor-pointer"
                          title="Attach files"
                        >
                          <Upload className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditFinding(f);
                            setFindingForm({
                              title: f.title,
                              description: f.description ?? "",
                              finding_type: f.finding_type,
                              severity: f.severity,
                              location: f.location ?? "",
                              found_at: f.found_at.slice(0, 16),
                            });
                          }}
                          className="rounded-md p-1.5 text-text-muted hover:text-accent transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteFindingTarget(f)}
                          className="rounded-md p-1.5 text-text-muted hover:text-danger transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <h4 className="text-sm font-medium text-text mb-1">{f.title}</h4>
                    {f.description && (
                      <p className="text-sm text-text-muted mb-2 whitespace-pre-wrap">{f.description}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-text-muted mb-2">
                      <span>{formatDateTime(f.found_at)}</span>
                      <span>by {getProfileName(f.profiles)}</span>
                      {f.location && <span>at {f.location}</span>}
                    </div>

                    {/* Attached files */}
                    {f.evidence_files.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
                          <Paperclip className="h-3 w-3" />
                          {f.evidence_files.length} file{f.evidence_files.length !== 1 ? "s" : ""}
                        </div>
                        {f.evidence_files.map((ef) => (
                          <div
                            key={ef.id}
                            className="flex items-center justify-between rounded-lg bg-surface-light px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-text-muted shrink-0" />
                              <span className="text-xs text-text truncate">{ef.file_name}</span>
                              <span className="text-xs text-text-muted shrink-0">
                                {formatFileSize(ef.file_size)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {ef.hash_sha256 && (
                                <span className="text-[10px] font-mono text-text-muted hidden lg:inline" title={ef.hash_sha256}>
                                  SHA: {ef.hash_sha256.slice(0, 8)}…
                                </span>
                              )}
                              <button
                                onClick={() => handleDownload(ef.id)}
                                className="rounded p-1 text-text-muted hover:text-accent transition-colors cursor-pointer"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(ef.id)}
                                className="rounded p-1 text-text-muted hover:text-danger transition-colors cursor-pointer"
                                title="Remove"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TIME TAB */}
      {tab === "time" && (
        <div>
          {timeEntries.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No time entries yet.</p>
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
                        {t.rate ? formatCurrency(Number(t.hours) * Number(t.rate)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* EXPENSES TAB */}
      {tab === "expenses" && (
        <div>
          {expenses.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No expenses yet.</p>
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

      {/* REPORTS TAB */}
      {tab === "reports" && (
        <div>
          {reports.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">No reports generated yet.</p>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                  <div>
                    <p className="text-sm font-medium text-text">{r.title}</p>
                    <p className="text-xs text-text-muted">{formatDate(r.created_at)}</p>
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

      {/* ========== NEW FINDING MODAL ========== */}
      <Modal
        open={newFindingOpen}
        onClose={() => { setNewFindingOpen(false); resetFindingForm(); }}
        title="Add Finding"
        className="max-w-xl"
      >
        <form onSubmit={handleAddFinding} className="space-y-4">
          <Input
            id="finding_title"
            label="Title"
            value={findingForm.title}
            onChange={(e) => setFindingForm({ ...findingForm, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-muted">Type</label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                value={findingForm.finding_type}
                onChange={(e) => setFindingForm({ ...findingForm, finding_type: e.target.value })}
              >
                {FINDING_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-muted">Severity</label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                value={findingForm.severity}
                onChange={(e) => setFindingForm({ ...findingForm, severity: e.target.value })}
              >
                {FINDING_SEVERITIES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="found_at"
              label="Timestamp"
              type="datetime-local"
              value={findingForm.found_at}
              onChange={(e) => setFindingForm({ ...findingForm, found_at: e.target.value })}
            />
            <Input
              id="location"
              label="Location / Source"
              value={findingForm.location}
              onChange={(e) => setFindingForm({ ...findingForm, location: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-muted">Description</label>
            <textarea
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[80px]"
              placeholder="Detailed description of the finding..."
              value={findingForm.description}
              onChange={(e) => setFindingForm({ ...findingForm, description: e.target.value })}
            />
          </div>

          {/* File attach zone */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-muted">Attach Files</label>
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={() => setDragOver(false)}
              className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                dragOver ? "border-accent bg-accent/5" : "border-border"
              }`}
            >
              <Upload className="h-6 w-6 text-text-muted mx-auto mb-2" />
              <p className="text-xs text-text-muted">
                Drag & drop files here, or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-accent hover:text-accent-dim cursor-pointer"
                >
                  browse
                </button>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPendingFiles((prev) => [...prev, ...files]);
                  e.target.value = "";
                }}
              />
            </div>
            {pendingFiles.length > 0 && (
              <div className="space-y-1 mt-2">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-surface-light px-3 py-1.5">
                    <span className="text-xs text-text truncate">{f.name} ({formatFileSize(f.size)})</span>
                    <button
                      type="button"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-text-muted hover:text-danger cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setNewFindingOpen(false); resetFindingForm(); }} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={isPending} className="flex-1">
              {pendingFiles.length > 0 ? `Add Finding + ${pendingFiles.length} file(s)` : "Add Finding"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========== EDIT FINDING MODAL ========== */}
      <Modal
        open={!!editFinding}
        onClose={() => { setEditFinding(null); resetFindingForm(); }}
        title={`Edit ${editFinding?.evidence_ref ?? "Finding"}`}
      >
        <form onSubmit={handleEditFinding} className="space-y-4">
          <p className="text-xs text-text-muted">
            Evidence ref <span className="font-mono text-accent">{editFinding?.evidence_ref}</span> and timestamp are immutable.
          </p>
          <Input
            id="edit_title"
            label="Title"
            value={findingForm.title}
            onChange={(e) => setFindingForm({ ...findingForm, title: e.target.value })}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-muted">Severity</label>
            <select
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
              value={findingForm.severity}
              onChange={(e) => setFindingForm({ ...findingForm, severity: e.target.value })}
            >
              {FINDING_SEVERITIES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <Input
            id="edit_location"
            label="Location / Source"
            value={findingForm.location}
            onChange={(e) => setFindingForm({ ...findingForm, location: e.target.value })}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-muted">Description</label>
            <textarea
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[80px]"
              value={findingForm.description}
              onChange={(e) => setFindingForm({ ...findingForm, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setEditFinding(null); resetFindingForm(); }} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={isPending} className="flex-1">Update</Button>
          </div>
        </form>
      </Modal>

      {/* ========== UPLOAD FILES TO EXISTING FINDING ========== */}
      <Modal
        open={!!uploadTarget}
        onClose={() => setUploadTarget(null)}
        title={`Upload to ${uploadTarget?.evidence_ref ?? "Finding"}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Select files to attach to this finding.</p>
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUploadFiles(e.target.files)}
          />
          <Button onClick={() => uploadInputRef.current?.click()} loading={isPending} className="w-full">
            <Upload className="h-4 w-4" />
            Choose Files
          </Button>
        </div>
      </Modal>

      {/* DELETE FINDING MODAL */}
      <Modal open={!!deleteFindingTarget} onClose={() => setDeleteFindingTarget(null)} title="Delete Finding">
        <p className="text-sm text-text-muted mb-2">
          Delete finding <span className="font-mono text-accent">{deleteFindingTarget?.evidence_ref}</span>?
        </p>
        <p className="text-sm text-text-muted mb-4">
          This action is logged in the audit trail. Attached files remain in storage for legal retention.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setDeleteFindingTarget(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={handleDeleteFinding} loading={isPending} className="flex-1">Delete</Button>
        </div>
      </Modal>

      {/* DELETE CASE MODAL */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Case">
        <p className="text-sm text-text-muted mb-4">
          Are you sure? This will delete all findings, time entries, and expenses. This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={handleDeleteCase} loading={isPending} className="flex-1">Delete Case</Button>
        </div>
      </Modal>
    </>
  );
}
