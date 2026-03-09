"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCase(formData: {
  title: string;
  description: string;
  priority: string;
  due_date?: string;
  client_id?: string;
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

  const { data: refResult } = await supabase.rpc("next_ref", {
    p_key: `${profile.organisation_id}:cases`,
    p_prefix: `CASE-${new Date().getFullYear()}`,
  });

  const { data, error } = await supabase
    .from("cases")
    .insert({
      organisation_id: profile.organisation_id,
      ref: refResult as string,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      due_date: formData.due_date || null,
      client_id: formData.client_id || null,
      assigned_to: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/cases");
  revalidatePath("/");
  return data;
}

export async function updateCase(
  caseId: string,
  updates: { title?: string; description?: string; status?: string; priority?: string }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cases")
    .update(updates)
    .eq("id", caseId);

  if (error) throw new Error(error.message);

  revalidatePath("/cases");
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
}
