"use server";

import { createClient } from "@/lib/supabase/server";

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, organisation_id, name, email, role")
    .eq("id", userId)
    .single();

  if (error || !data) throw new Error("Profile not found");
  return data;
}

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user;
}

export async function getAuthProfile() {
  const user = await getAuthUser();
  const profile = await getProfile(user.id);
  return { user, profile };
}

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient();
  const { user, profile } = await getAuthProfile();

  await supabase.from("audit_logs").insert({
    organisation_id: profile.organisation_id,
    profile_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    new_data: metadata ?? null,
  });
}
