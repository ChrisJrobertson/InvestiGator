"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getAuthProfile, logAudit } from "./audit";

export async function generatePortalLink(caseId: string, expiryDays: number = 30) {
  const supabase = await createClient();
  const { user } = await getAuthProfile();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const { data, error } = await supabase
    .from("portal_links")
    .insert({
      case_id: caseId,
      created_by_id: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit("CREATE", "portal_link", data.id, { case_id: caseId, expires_at: expiresAt.toISOString() });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}/portal/${data.token}`;

  revalidatePath(`/cases/${caseId}`);
  return { url, token: data.token, id: data.id };
}

export async function revokePortalLink(linkId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("portal_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", linkId)
    .select("case_id")
    .single();

  if (error) throw new Error(error.message);

  await logAudit("REVOKE", "portal_link", linkId);

  revalidatePath(`/cases/${data.case_id}`);
}

export async function listPortalLinks(caseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("portal_links")
    .select("id, token, expires_at, revoked_at, last_accessed_at, access_count, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPortalData(token: string) {
  const supabase = createAdminClient();

  const { data: link, error } = await supabase
    .from("portal_links")
    .select("id, case_id, expires_at, revoked_at, access_count")
    .eq("token", token)
    .single();

  if (error || !link) return { error: "Invalid portal link" };
  if (link.revoked_at) return { error: "This link has been revoked" };
  if (new Date(link.expires_at) < new Date()) return { error: "This link has expired" };

  await supabase
    .from("portal_links")
    .update({
      last_accessed_at: new Date().toISOString(),
      access_count: (link.access_count ?? 0) + 1,
    })
    .eq("id", link.id);

  const { data: caseData } = await supabase
    .from("cases")
    .select("ref, title, status, description, opened_at, organisations(name, logo_url)")
    .eq("id", link.case_id)
    .single();

  const { data: findings } = await supabase
    .from("findings")
    .select("evidence_ref, title, description, finding_type, severity, found_at, status")
    .eq("case_id", link.case_id)
    .eq("client_visible", true)
    .is("deleted_at", null)
    .order("found_at", { ascending: false });

  const { data: reports } = await supabase
    .from("reports")
    .select("id, title, report_type, status, created_at")
    .eq("case_id", link.case_id)
    .in("status", ["APPROVED", "DELIVERED", "ISSUED"])
    .order("created_at", { ascending: false });

  return {
    case: caseData,
    findings: findings ?? [],
    reports: reports ?? [],
    orgName: (caseData?.organisations as unknown as { name: string })?.name ?? "InvestiGator",
  };
}
