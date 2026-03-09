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

### Next.js Application

- Located in `/workspace/investigator/` (Next.js 16, App Router, TypeScript strict, Tailwind CSS 4).
- Dev server: `pnpm dev` (runs on port 3000 by default).
- Build: `pnpm build` | Lint: `pnpm lint`
- Env vars in `.env.local` — `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are pre-configured.
- Optional secrets: `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `SENTRY_DSN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

### Gotchas

- The auth trigger `handle_new_user()` creates the organisation **before** the profile to satisfy FK constraints. The original playbook version had the order reversed — do not revert.
- Supabase email confirmation is enabled on the hosted project. For dev testing, manually confirm users via: `UPDATE auth.users SET email_confirmed_at = now() WHERE email = '...'`
- 15 migrations are applied (see `Supabase-list_migrations`). Schema changes should be done via `Supabase-apply_migration`.
- Security advisors are clean (zero warnings).
- `@sentry/cli` build scripts are blocked by pnpm. If you need Sentry source maps, add `@sentry/cli` to `pnpm.onlyBuiltDependencies` in `package.json`.
