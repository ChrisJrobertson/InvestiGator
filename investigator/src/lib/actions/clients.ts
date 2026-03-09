"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createClientRecord(formData: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  notes?: string;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organisation_id")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

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

  revalidatePath("/clients");
  return data;
}
