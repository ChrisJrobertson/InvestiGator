"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FINDING_TYPES, FINDING_SEVERITIES } from "@/lib/constants";

interface FindingFormProps {
  onSubmit: (data: FindingFormData) => Promise<void>;
  loading?: boolean;
}

export interface FindingFormData {
  title: string;
  description: string;
  finding_type: string;
  severity: string;
  location: string;
}

export function FindingForm({ onSubmit, loading }: FindingFormProps) {
  const [formData, setFormData] = useState<FindingFormData>({
    title: "",
    description: "",
    finding_type: "OBSERVATION",
    severity: "INFO",
    location: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="title"
        label="Title"
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
          <label className="block text-sm font-medium text-text-muted">Type</label>
          <select
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
            value={formData.finding_type}
            onChange={(e) => setFormData({ ...formData, finding_type: e.target.value })}
          >
            {FINDING_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-muted">Severity</label>
          <select
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
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
        value={formData.location}
        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
      />
      <Button type="submit" loading={loading} className="w-full">
        Add Finding
      </Button>
    </form>
  );
}
