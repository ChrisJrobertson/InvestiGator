import { createClient } from "@supabase/supabase-js";

let cachedAdminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (cachedAdminClient) return cachedAdminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are missing.");
  }

  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey);
  return cachedAdminClient;
}
