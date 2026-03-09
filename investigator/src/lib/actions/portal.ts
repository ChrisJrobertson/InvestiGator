"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, logAudit } from "@/lib/actions/audit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function generatePortalLink(caseId: string, expiryDays = 14) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const { data, error } = await supabase
    .from("portal_links")
    .insert({
      case_id: caseId,
      created_by_id: profile.id,
      expires_at: expiresAt.toISOString(),
    })
    .select("id, token")
    .single();
  if (error) throw error;

  await logAudit("portal_link.created", "portal_link", data.id, {
    caseId,
    expiresAt: expiresAt.toISOString(),
  });
  revalidatePath(`/cases/${caseId}`);
  return data;
}

export async function revokePortalLink(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portal_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .select("case_id")
    .single();
  if (error) throw error;

  await logAudit("portal_link.revoked", "portal_link", id);
  if (data?.case_id) revalidatePath(`/cases/${data.case_id}`);
}

export async function listPortalLinks(caseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portal_links")
    .select("id, token, expires_at, revoked_at, access_count, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    token: string;
    expires_at: string;
    revoked_at: string | null;
    access_count: number;
    created_at: string;
  }>;
}

export async function getPortalData(token: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: linkRaw, error: linkError } = await supabaseAdmin
    .from("portal_links")
    .select("id, case_id, expires_at, revoked_at, access_count")
    .eq("token", token)
    .single();
  const link = linkRaw as {
    id: string;
    case_id: string;
    expires_at: string;
    revoked_at: string | null;
    access_count: number;
  } | null;
  if (linkError || !link) throw linkError ?? new Error("Portal link not found");

  if (link.revoked_at) throw new Error("Portal link revoked");
  if (new Date(link.expires_at) < new Date()) throw new Error("Portal link expired");

  await supabaseAdmin
    .from("portal_links")
    .update(
      {
        last_accessed_at: new Date().toISOString(),
        access_count: (link.access_count ?? 0) + 1,
      } as never,
    )
    .eq("id", link.id);

  const [{ data: caseRowRaw }, { data: findingsRaw }, { data: reportsRaw }] = await Promise.all([
    supabaseAdmin
      .from("cases")
      .select("id, ref, title, status, client_id")
      .eq("id", link.case_id)
      .single(),
    supabaseAdmin
      .from("findings")
      .select("id, evidence_ref, type, content, source, timestamp, client_visible")
      .eq("case_id", link.case_id)
      .eq("client_visible", true)
      .is("deleted_at", null)
      .order("timestamp", { ascending: true }),
    supabaseAdmin
      .from("reports")
      .select("id, title, status, pdf_storage_path, word_storage_path, created_at")
      .eq("case_id", link.case_id)
      .in("status", ["DELIVERED", "APPROVED", "ISSUED"])
      .order("created_at", { ascending: false }),
  ]);
  const caseRow = caseRowRaw as {
    id: string;
    ref: string;
    title: string;
    status: string;
    client_id: string | null;
  } | null;
  const findings = (findingsRaw ?? []) as Array<{
    id: string;
    evidence_ref: string;
    type: string;
    content: string;
    source: string;
    timestamp: string;
    client_visible: boolean;
  }>;
  const reports = (reportsRaw ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    pdf_storage_path: string | null;
    word_storage_path: string | null;
    created_at: string;
  }>;

  const clientResponse =
    caseRow?.client_id
      ? await supabaseAdmin
          .from("clients")
          .select("id, name, contact_name")
          .eq("id", caseRow.client_id)
          .single()
      : { data: null };
  const client = (clientResponse.data ?? null) as
    | { id: string; name: string; contact_name: string | null }
    | null;

  return {
    case: caseRow,
    client,
    findings,
    reports,
  };
}
