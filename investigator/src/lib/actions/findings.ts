"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createFinding(
  caseId: string,
  formData: {
    title: string;
    description?: string;
    finding_type: string;
    severity: string;
    location?: string;
  }
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: refResult } = await supabase.rpc("next_ref", {
    p_key: `${caseId}:findings`,
    p_prefix: "EVD",
  });

  const { data, error } = await supabase
    .from("findings")
    .insert({
      case_id: caseId,
      evidence_ref: refResult as string,
      title: formData.title,
      description: formData.description || null,
      finding_type: formData.finding_type,
      severity: formData.severity,
      location: formData.location || null,
      found_by: user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
  return data;
}
