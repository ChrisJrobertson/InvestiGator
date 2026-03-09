"use server";

import { createClient } from "@/lib/supabase/server";

const PLAN_LIMITS = {
  SOLO: { casesPerMonth: 10, reportsPerMonth: 5, maxUsers: 1 },
  PROFESSIONAL: { casesPerMonth: Number.POSITIVE_INFINITY, reportsPerMonth: 20, maxUsers: 3 },
  AGENCY: {
    casesPerMonth: Number.POSITIVE_INFINITY,
    reportsPerMonth: Number.POSITIVE_INFINITY,
    maxUsers: 10,
  },
  ENTERPRISE: {
    casesPerMonth: Number.POSITIVE_INFINITY,
    reportsPerMonth: Number.POSITIVE_INFINITY,
    maxUsers: Number.POSITIVE_INFINITY,
  },
} as const;

async function getOrganisationPlan(orgId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("plan")
    .eq("id", orgId)
    .single();
  if (error || !data) throw error ?? new Error("Organisation not found");
  return (data.plan as keyof typeof PLAN_LIMITS) ?? "SOLO";
}

function startOfCurrentMonthIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function enforceCaseLimit(orgId: string) {
  const supabase = await createClient();
  const plan = await getOrganisationPlan(orgId);
  const limit = PLAN_LIMITS[plan].casesPerMonth;
  if (!Number.isFinite(limit)) return;

  const { count, error } = await supabase
    .from("cases")
    .select("*", { count: "exact", head: true })
    .eq("organisation_id", orgId)
    .gte("created_at", startOfCurrentMonthIso())
    .is("deleted_at", null);
  if (error) throw error;

  if ((count ?? 0) >= limit) {
    throw new Error(`Case limit reached (${count}/${limit}) for ${plan}. Upgrade plan to continue.`);
  }
}

export async function enforceReportLimit(orgId: string) {
  const supabase = await createClient();
  const plan = await getOrganisationPlan(orgId);
  const limit = PLAN_LIMITS[plan].reportsPerMonth;
  if (!Number.isFinite(limit)) return;

  const { data: caseRows, error: caseError } = await supabase
    .from("cases")
    .select("id")
    .eq("organisation_id", orgId)
    .is("deleted_at", null);
  if (caseError) throw caseError;
  const caseIds = (caseRows ?? []).map((row) => row.id);
  if (!caseIds.length) return;

  const { count, error } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .in("case_id", caseIds)
    .gte("created_at", startOfCurrentMonthIso());
  if (error) throw error;

  if ((count ?? 0) >= limit) {
    throw new Error(`Report limit reached (${count}/${limit}) for ${plan}. Upgrade plan to continue.`);
  }
}
