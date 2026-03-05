# Sundown HQ v1 Launch Checklist

_Last reviewed: 2026-03-05 (codebase + local Supabase runtime checks)_

## 1) Environment and Secrets
- [x] `.env.local` configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [x] `SUPABASE_SERVICE_ROLE_KEY` present locally for scripts only (never exposed to client)
- [ ] Supabase Auth URL Configuration uses correct site URL and redirect URLs
- [ ] Any previously shared/test keys rotated if needed

## 2) Database Setup
- [x] Run all migrations 001–010 in order
- [x] Confirm `get_active_employee_names` and `verify_employee_pin` functions exist
- [x] Confirm RLS policies recreated successfully
- [ ] Create `observation-photos` storage bucket in Supabase Dashboard
- [ ] Create `calendar-files` storage bucket in Supabase Dashboard

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
- [x] Observation photo upload works (requires storage bucket)
- [x] Realtime checklist updates work for admin
- [x] Drop Planner: create drop, add candidates, move stages, export CSV
- [x] Quick Add (+) flow: pick task → search animal → navigate
- [x] Inventory page shows real species/status/building breakdowns

## 5) Engineering Quality
- [x] `npm run lint` passes
- [x] `npm test` passes (42 tests)
- [x] `npm run build` passes (PWA service worker generated)
- [ ] GitHub Actions CI passes on `main`

## 6) PWA
- [x] `vite-plugin-pwa` configured with manifest and icons
- [x] Service worker caches app shell
- [ ] Test install on employee phone (Chrome/Safari)

## 7) Release Operations
- [x] README has complete setup instructions
- [ ] README tested on clean checkout
- [ ] First release tag created (`v1.0.0`)
- [ ] Deploy target connected (e.g. Vercel) and production env vars configured
