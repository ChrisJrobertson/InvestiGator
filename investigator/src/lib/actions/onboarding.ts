"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthProfile } from "./audit";

export async function checkOnboardingRequired(): Promise<boolean> {
  const supabase = await createClient();
  const { user } = await getAuthProfile();

  const { data: org } = await supabase
    .from("organisations")
    .select("onboarding_completed")
    .eq("id", (await supabase.from("profiles").select("organisation_id").eq("id", user.id).single()).data!.organisation_id)
    .single();

  return !org?.onboarding_completed;
}

export async function updateOrganisation(data: {
  name?: string;
  address?: string;
  phone?: string;
  vat_number?: string;
  vat_registered?: boolean;
}) {
  const supabase = await createClient();
  const { profile } = await getAuthProfile();

  const { error } = await supabase
    .from("organisations")
    .update(data)
    .eq("id", profile.organisation_id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function completeOnboarding() {
  const supabase = await createClient();
  const { profile } = await getAuthProfile();

  const { error } = await supabase
    .from("organisations")
    .update({ onboarding_completed: true })
    .eq("id", profile.organisation_id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}
