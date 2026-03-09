import { PLAN_LIMITS, type PlanName } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const CREDIT_COSTS = {
  REPORT: 5,
  OCR: 1,
  IMAGE_DESC: 1,
  TRANSCRIPTION: 3,
  BG_REMOVAL: 1,
} as const;

export async function checkAndDeductCredits(orgId: string, amount: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("deduct_ai_credits", {
    p_org_id: orgId,
    p_amount: amount,
  });

  if (error) throw error;
  return Boolean(data);
}

export async function getAiUsage(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("plan, ai_credits_used, ai_credits_reset_at")
    .eq("id", orgId)
    .single();

  if (error) throw error;

  const plan = (data.plan as PlanName) ?? "SOLO";
  const limit = PLAN_LIMITS[plan]?.aiCredits ?? PLAN_LIMITS.SOLO.aiCredits;

  return {
    used: data.ai_credits_used ?? 0,
    limit,
    resetAt: data.ai_credits_reset_at ?? null,
  };
}
