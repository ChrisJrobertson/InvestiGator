"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ClientFormProps {
  onSubmit: (data: ClientFormData) => Promise<void>;
  initialData?: Partial<ClientFormData>;
  loading?: boolean;
}

export interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  contact_person: string;
  notes: string;
}

export function ClientForm({ onSubmit, initialData, loading }: ClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    name: initialData?.name ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    address: initialData?.address ?? "",
    contact_person: initialData?.contact_person ?? "",
    notes: initialData?.notes ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="name"
        label="Client Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <Input
        id="contact_person"
        label="Contact Person"
        value={formData.contact_person}
        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          id="email"
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <Input
          id="phone"
          label="Phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>
      <Input
        id="address"
        label="Address"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
      />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-muted">Notes</label>
        <textarea
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[60px]"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
      <Button type="submit" loading={loading} className="w-full">
        {initialData ? "Update Client" : "Add Client"}
      </Button>
    </form>
  );
}
