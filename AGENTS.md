# InvestiGator

## Cursor Cloud specific instructions

### Supabase Project

- **Project ID:** `bstnociyejtsvqzweuvr`
- **URL:** `https://bstnociyejtsvqzweuvr.supabase.co`
- **Region:** `us-east-1`
- **Organization:** Synqforge (`firmmjatdzqkhtdhtaxy`)

### Database Schema

13 public tables: `organisations`, `profiles`, `clients`, `cases`, `findings`, `evidence_files`, `reports`, `time_entries`, `expenses`, `invoices`, `invoice_line_items`, `audit_logs`, `ref_counters`.

- All tables have RLS enabled with org-scoped policies via `profiles.organisation_id` linked to `auth.uid()`.
- `next_ref(key, prefix)` generates sequential references (e.g., `CASE-2026-001`).
- `update_updated_at()` trigger auto-updates `updated_at` on all applicable tables.
- Auth trigger `on_auth_user_created` auto-creates a profile + organisation on signup.

### Storage

- Bucket `evidence` (private, 50 MB limit). Paths: `{organisation_id}/{case_id}/*`.
- Storage policies scope read/write to the user's organisation folder.

### Notes

- 14 migrations are applied (see `Supabase-list_migrations`). Schema changes should be done via `Supabase-apply_migration`.
- Security advisors are clean (zero warnings after fixing function search_path).
- No frontend or backend application code exists yet. Future agents should re-evaluate when app code is added.
