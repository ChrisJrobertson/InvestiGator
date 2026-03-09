"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CASE_PRIORITIES, CASE_STATUSES } from "@/lib/constants";

interface CaseFormProps {
  onSubmit: (data: CaseFormData) => Promise<void>;
  initialData?: Partial<CaseFormData>;
  loading?: boolean;
}

export interface CaseFormData {
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
}

export function CaseForm({ onSubmit, initialData, loading }: CaseFormProps) {
  const [formData, setFormData] = useState<CaseFormData>({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    status: initialData?.status ?? "OPEN",
    priority: initialData?.priority ?? "MEDIUM",
    due_date: initialData?.due_date ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="title"
        label="Case Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-muted">Description</label>
        <textarea
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[80px]"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-muted">Status</label>
          <select
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            {CASE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-muted">Priority</label>
          <select
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          >
            {CASE_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      <Input
        id="due_date"
        label="Due Date"
        type="date"
        value={formData.due_date}
        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
      />
      <Button type="submit" loading={loading} className="w-full">
        {initialData ? "Update Case" : "Create Case"}
      </Button>
    </form>
  );
}
