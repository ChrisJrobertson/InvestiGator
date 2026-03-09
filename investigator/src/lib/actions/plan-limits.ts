"use server";

import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/plans";

function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function getOrgPlan(orgId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organisations")
    .select("plan")
    .eq("id", orgId)
    .single();
  return data?.plan ?? "SOLO";
}

export async function enforceReportLimit(orgId: string): Promise<void> {
  const plan = await getOrgPlan(orgId);
  const limits = PLAN_LIMITS[plan];
  if (!limits || limits.reportsPerMonth === Infinity) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .gte("created_at", getMonthStart());

  if ((count ?? 0) >= limits.reportsPerMonth) {
    throw new Error(
      `You've reached your ${plan} plan limit of ${limits.reportsPerMonth} AI reports this month. Upgrade to generate more reports.`
    );
  }
}

export async function enforceCaseLimit(orgId: string): Promise<void> {
  const plan = await getOrgPlan(orgId);
  const limits = PLAN_LIMITS[plan];
  if (!limits || limits.casesPerMonth === Infinity) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("cases")
    .select("id", { count: "exact", head: true })
    .gte("created_at", getMonthStart());

  if ((count ?? 0) >= limits.casesPerMonth) {
    throw new Error(
      `You've reached your ${plan} plan limit of ${limits.casesPerMonth} cases this month. Upgrade your plan to create more cases.`
    );
  }
}

export async function getUsage(orgId: string) {
  const supabase = await createClient();
  const monthStart = getMonthStart();

  const [casesRes, reportsRes, usersRes] = await Promise.all([
    supabase
      .from("cases")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", orgId)
      .eq("is_active", true),
  ]);

  const plan = await getOrgPlan(orgId);
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.SOLO;

  return {
    plan,
    casesThisMonth: casesRes.count ?? 0,
    casesLimit: limits.casesPerMonth,
    reportsThisMonth: reportsRes.count ?? 0,
    reportsLimit: limits.reportsPerMonth,
    activeUsers: usersRes.count ?? 0,
    usersLimit: limits.maxUsers,
  };
}
