# Sundown HQ v1 Launch Checklist

## 1) Environment and Secrets
- [ ] `.env.local` configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` present locally for scripts only (never exposed to client)
- [ ] Supabase Auth URL Configuration uses correct site URL and redirect URLs
- [ ] Any previously shared/test keys rotated if needed

## 2) Database Setup
- [ ] Run `supabase/migrations/001_secure_employee_auth.sql`
- [ ] Run `supabase/migrations/002_schema_policy_alignment.sql`
- [ ] Confirm `get_active_employee_names` and `verify_employee_pin` functions exist
- [ ] Confirm RLS policies recreated successfully

## 3) Admin Access Bootstrap
- [ ] Ensure admin auth user exists in `auth.users`
- [ ] Ensure matching row exists in `employees` with same UUID and `role='super_admin'`
- [ ] Verify admin login works at `/login?mode=admin`

## 4) Functional Validation
- [ ] CSV import succeeds with `February 2025 animal inventory - Sheet1.csv`
- [ ] Import banner reports `inserted`, `skipped`, and `failed` counts
- [ ] Employee login works via PIN flow
- [ ] Protected routes block unauthorized users
- [ ] Admin Dashboard, Animal List, Staff, and Employee Home show clear errors on failed queries

## 5) Engineering Quality
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes
- [ ] GitHub Actions CI passes on `main`

## 6) Release Operations
- [ ] README setup instructions followed on a clean machine
- [ ] First release tag created (`v1.0.0`)
- [ ] Deploy target connected (e.g. Vercel) and production env vars configured
