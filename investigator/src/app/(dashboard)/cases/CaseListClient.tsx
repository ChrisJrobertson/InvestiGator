"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { CaseCard } from "@/components/cases/CaseCard";
import { createCase } from "@/lib/actions/cases";
import { CASE_PRIORITIES, CASE_STATUSES } from "@/lib/constants";
import { Plus, Search, Filter } from "lucide-react";

interface CaseRow {
  id: string;
  ref: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  client_id: string | null;
  clients: { name: string } | { name: string }[] | null;
}

interface ClientOption {
  id: string;
  name: string;
}

interface InvestigatorOption {
  id: string;
  name: string;
  email: string;
}

interface Props {
  cases: CaseRow[];
  clients: ClientOption[];
  investigators: InvestigatorOption[];
  showNewModal?: boolean;
  initialFilters?: {
    status?: string;
    priority?: string;
    client_id?: string;
    search?: string;
  };
  children?: React.ReactNode;
}

export function CaseListClient({
  cases,
  clients,
  investigators,
  showNewModal,
  initialFilters,
  children,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(showNewModal ?? false);
  const [search, setSearch] = useState(initialFilters?.search ?? "");
  const [statusFilter, setStatusFilter] = useState(initialFilters?.status ?? "");
  const [priorityFilter, setPriorityFilter] = useState(initialFilters?.priority ?? "");
  const [clientFilter, setClientFilter] = useState(initialFilters?.client_id ?? "");

  const [form, setForm] = useState({
    title: "",
    description: "",
    client_id: "",
    assigned_to: "",
    priority: "MEDIUM",
    due_date: "",
  });

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (clientFilter) params.set("client_id", clientFilter);
    router.push(`/cases?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setClientFilter("");
    router.push("/cases");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const data = await createCase({
          title: form.title,
          description: form.description || undefined,
          client_id: form.client_id || undefined,
          assigned_to: form.assigned_to || undefined,
          priority: form.priority,
          due_date: form.due_date || undefined,
        });
        toast("success", `Case ${data.ref} created`);
        setModalOpen(false);
        setForm({
          title: "",
          description: "",
          client_id: "",
          assigned_to: "",
          priority: "MEDIUM",
          due_date: "",
        });
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const hasActiveFilters = statusFilter || priorityFilter || clientFilter || search;

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search cases..."
              className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            New Case
          </Button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted" />
          <select
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {CASE_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            {CASE_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={applyFilters}>
            Apply
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Cases grid or children (empty state) */}
      {cases.length === 0 ? (
        children ?? (
          <div className="text-center py-12 text-sm text-text-muted">
            No cases match your filters.
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <CaseCard
              key={c.id}
              id={c.id}
              ref={c.ref}
              title={c.title}
              status={c.status}
              priority={c.priority}
              clientName={Array.isArray(c.clients) ? c.clients[0]?.name : c.clients?.name}
              createdAt={c.created_at}
            />
          ))}
        </div>
      )}

      {/* New Case Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Case"
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="title"
            label="Case Title"
            placeholder="e.g. Insurance Fraud Investigation"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-muted">Client</label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-muted">Investigator</label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              >
                <option value="">Assign to me</option>
                {investigators.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-muted">Priority</label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {CASE_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <Input
              id="due_date"
              label="Due Date"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-muted">Description</label>
            <textarea
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[80px]"
              placeholder="Brief description of the investigation..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={isPending} className="flex-1">
              Create Case
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
