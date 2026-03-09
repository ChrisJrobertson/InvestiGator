"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface TimeEntryFormProps {
  onSubmit: (data: TimeEntryFormData) => Promise<void>;
  loading?: boolean;
}

export interface TimeEntryFormData {
  description: string;
  hours: string;
  rate: string;
  date: string;
  billable: boolean;
}

export function TimeEntryForm({ onSubmit, loading }: TimeEntryFormProps) {
  const [formData, setFormData] = useState<TimeEntryFormData>({
    description: "",
    hours: "",
    rate: "",
    date: new Date().toISOString().slice(0, 10),
    billable: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="description"
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        required
      />
      <div className="grid grid-cols-3 gap-4">
        <Input
          id="hours"
          label="Hours"
          type="number"
          step="0.25"
          min="0.25"
          value={formData.hours}
          onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
          required
        />
        <Input
          id="rate"
          label="Rate ($/hr)"
          type="number"
          step="0.01"
          value={formData.rate}
          onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
        />
        <Input
          id="date"
          label="Date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={formData.billable}
          onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
          className="rounded border-border"
        />
        Billable
      </label>
      <Button type="submit" loading={loading} className="w-full">
        Log Time
      </Button>
    </form>
  );
}
