"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ClientCard } from "@/components/clients/ClientCard";
import { createClientRecord, updateClient, deleteClient } from "@/lib/actions/clients";
import { Plus, Search, Trash2, Pencil } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_person: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  clients: Client[];
  showNewModal?: boolean;
  initialSearch?: string;
  children?: React.ReactNode;
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  contact_person: "",
  notes: "",
};

export function ClientListClient({ clients, showNewModal, initialSearch, children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch ?? "");
  const [modalOpen, setModalOpen] = useState(showNewModal ?? false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
      contact_person: client.contact_person ?? "",
      notes: client.notes ?? "",
    });
    setModalOpen(true);
  };

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set("search", search);
    else params.delete("search");
    router.push(`/clients?${params.toString()}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (editingClient) {
          await updateClient(editingClient.id, form);
          toast("success", "Client updated");
        } else {
          await createClientRecord(form);
          toast("success", "Client created");
        }
        setModalOpen(false);
        setForm(emptyForm);
        setEditingClient(null);
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
      }
    });
  };

  const handleDelete = (client: Client) => {
    setDeleteConfirm(client);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    startTransition(async () => {
      try {
        await deleteClient(deleteConfirm.id);
        toast("success", "Client deleted");
        setDeleteConfirm(null);
        router.refresh();
      } catch (err) {
        toast("error", (err as Error).message);
        setDeleteConfirm(null);
      }
    });
  };

  return (
    <>
      {/* Search bar + New button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search clients..."
              className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button variant="secondary" size="md" onClick={handleSearch}>
            Search
          </Button>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Client grid or empty state */}
      {clients.length === 0 ? (
        children
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div key={c.id} className="relative group">
              <ClientCard
                id={c.id}
                name={c.name}
                email={c.email ?? undefined}
                contactPerson={c.contact_person ?? undefined}
              />
              <div className="absolute top-3 right-3 hidden group-hover:flex gap-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openEdit(c);
                  }}
                  className="rounded-md bg-surface-light p-1.5 text-text-muted hover:text-accent transition-colors cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(c);
                  }}
                  className="rounded-md bg-surface-light p-1.5 text-text-muted hover:text-danger transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingClient(null);
        }}
        title={editingClient ? "Edit Client" : "New Client"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Client Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            id="contact_person"
            label="Contact Person"
            value={form.contact_person}
            onChange={(e) =>
              setForm({ ...form, contact_person: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              id="phone"
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <Input
            id="address"
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-muted">
              Notes
            </label>
            <textarea
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50 min-h-[60px]"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setEditingClient(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={isPending} className="flex-1">
              {editingClient ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Client"
      >
        <p className="text-sm text-text-muted mb-4">
          Are you sure you want to delete{" "}
          <span className="text-text font-medium">
            {deleteConfirm?.name}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setDeleteConfirm(null)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            loading={isPending}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
