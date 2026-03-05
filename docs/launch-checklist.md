# Sundown HQ v1 Launch Checklist

_Last reviewed: 2026-03-05 (codebase + local Supabase runtime checks)_

## 1) Environment and Secrets
- [x] `.env.local` configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [x] `SUPABASE_SERVICE_ROLE_KEY` present locally for scripts only (never exposed to client)
- [ ] Supabase Auth URL Configuration uses correct site URL and redirect URLs
- [ ] Any previously shared/test keys rotated if needed

## 2) Database Setup
- [x] Run `supabase/migrations/001_secure_employee_auth.sql`
- [x] Run `supabase/migrations/002_schema_policy_alignment.sql`
- [x] Confirm `get_active_employee_names` and `verify_employee_pin` functions exist
- [x] Confirm RLS policies recreated successfully

## 3) Admin Access Bootstrap
- [x] Ensure admin auth user exists in `auth.users`
- [x] Ensure matching row exists in `employees` with same UUID and `role='super_admin'`
- [x] Verify admin login works at `/login?mode=admin`

## 4) Functional Validation
- [ ] CSV import succeeds with `February 2025 animal inventory - Sheet1.csv`
- [x] Import banner reports `inserted`, `skipped`, and `failed` counts
- [ ] Employee login works via PIN flow
- [x] Protected routes block unauthorized users
- [x] Admin Dashboard, Animal List, Staff, and Employee Home show clear errors on failed queries

## 5) Engineering Quality
- [x] `npm run lint` passes
- [x] `npm test` passes
- [x] `npm run build` passes
- [ ] GitHub Actions CI passes on `main`

## 6) Release Operations
- [ ] README setup instructions followed on a clean machine
- [ ] First release tag created (`v1.0.0`)
- [ ] Deploy target connected (e.g. Vercel) and production env vars configured
