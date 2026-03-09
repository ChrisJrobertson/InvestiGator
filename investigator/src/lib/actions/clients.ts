"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getCurrentProfile, logAudit } from "@/lib/actions/audit";

type ListClientFilters = {
  search?: string;
  type?: string;
};

export type ClientListItem = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  type: string;
  created_at: string;
};

export async function listClients(
  filters: ListClientFilters = {},
): Promise<ClientListItem[]> {
  const supabase = await createSupabaseClient();
  let query = supabase
    .from("clients")
    .select("id, name, contact_name, email, phone, type, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }
  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ClientListItem[];
}

export async function getClient(id: string) {
  const supabase = await createSupabaseClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name, contact_name, email, phone, type, address, notes")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;

  const { count, error: countError } = await supabase
    .from("cases")
    .select("*", { count: "exact", head: true })
    .eq("client_id", id)
    .is("deleted_at", null);

  if (countError) throw countError;

  return { ...client, caseCount: count ?? 0 };
}

export async function createClient(formData: FormData) {
  const supabase = await createSupabaseClient();
  const profile = await getCurrentProfile();

  const payload = {
    organisation_id: profile.organisation_id,
    name: String(formData.get("name") ?? ""),
    contact_name: String(formData.get("contact_name") ?? ""),
    contact_person: String(formData.get("contact_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    type: String(formData.get("type") ?? "CORPORATE"),
    address: String(formData.get("address") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };

  const { data, error } = await supabase
    .from("clients")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;

  await logAudit("client.created", "client", data.id, payload);
  revalidatePath("/clients");
}

export async function updateClient(id: string, formData: FormData) {
  const supabase = await createSupabaseClient();
  const payload = {
    name: String(formData.get("name") ?? ""),
    contact_name: String(formData.get("contact_name") ?? ""),
    contact_person: String(formData.get("contact_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    type: String(formData.get("type") ?? "CORPORATE"),
    address: String(formData.get("address") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };

  const { error } = await supabase.from("clients").update(payload).eq("id", id);
  if (error) throw error;

  await logAudit("client.updated", "client", id, payload);
  revalidatePath("/clients");
}

export async function deleteClient(id: string) {
  const supabase = await createSupabaseClient();

  const { count, error: activeCaseError } = await supabase
    .from("cases")
    .select("*", { count: "exact", head: true })
    .eq("client_id", id)
    .in("status", ["OPEN", "ACTIVE", "ON_HOLD"])
    .is("deleted_at", null);

  if (activeCaseError) throw activeCaseError;
  if ((count ?? 0) > 0) {
    throw new Error("Cannot delete client with active cases.");
  }

  const { error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  await logAudit("client.deleted", "client", id);
  revalidatePath("/clients");
}
