"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthProfile, logAudit } from "./audit";

export async function listClients(search?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select("id, name, email, phone, contact_person, address, notes, created_at")
    .order("name");

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getClient(id: string) {
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);

  const { count } = await supabase
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id);

  return { ...client, case_count: count ?? 0 };
}

export interface ClientFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  notes?: string;
}

export async function createClientRecord(formData: ClientFormData) {
  const supabase = await createClient();
  const { profile } = await getAuthProfile();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      organisation_id: profile.organisation_id,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      contact_person: formData.contact_person || null,
      notes: formData.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit("CREATE", "client", data.id, { name: formData.name });

  revalidatePath("/clients");
  revalidatePath("/cases");
  return data;
}

export async function updateClient(id: string, formData: ClientFormData) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .update({
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      contact_person: formData.contact_person || null,
      notes: formData.notes || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit("UPDATE", "client", id, { name: formData.name });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return data;
}

export async function deleteClient(id: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id)
    .in("status", ["OPEN", "IN_PROGRESS", "REVIEW"]);

  if (count && count > 0) {
    throw new Error(`Cannot delete client with ${count} active case(s). Close or reassign them first.`);
  }

  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) throw new Error(error.message);

  await logAudit("DELETE", "client", id);

  revalidatePath("/clients");
  revalidatePath("/cases");
}
