"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  loading?: boolean;
}

export interface ExpenseFormData {
  description: string;
  amount: string;
  category: string;
  date: string;
  billable: boolean;
}

export function ExpenseForm({ onSubmit, loading }: ExpenseFormProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    description: "",
    amount: "",
    category: "OTHER",
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
          id="amount"
          label="Amount ($)"
          type="number"
          step="0.01"
          min="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-muted">Category</label>
          <select
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
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
        Add Expense
      </Button>
    </form>
  );
}
