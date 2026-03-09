"use server";

import { createClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  id: string;
  organisation_id: string;
  email: string;
  name: string;
};

export async function getCurrentProfile(): Promise<CurrentProfile> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, organisation_id, email, name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  return profile as CurrentProfile;
}

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { error } = await supabase.from("audit_logs").insert({
    organisation_id: profile.organisation_id,
    user_id: profile.id,
    profile_id: profile.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? null,
    new_data: metadata ?? null,
  });

  if (error) throw error;
}
