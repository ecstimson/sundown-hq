# Sundown HQ

Animal operations platform for Sundown Reptiles — managing ~1,000 geckos + 60 tree monitor breeders across 2 warehouse buildings.

- **Employee PWA** (mobile-first): Observations, weight tracking, daily checklists, SOPs, group chat
- **Admin Dashboard** (desktop-first): Full CRUD, drop planner, CSV import/export, staff management, calendar
- **Supabase Backend**: Auth, Postgres with RLS, Realtime, Storage

## Requirements

- Node.js 20+
- npm 9+
- A [Supabase](https://supabase.com) project

## Local Setup

```bash
# 1. Clone and install
git clone <repo-url> sundown-hq
cd sundown-hq
npm install

# 2. Create env file from template
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

| Variable | Source | Required |
|----------|--------|----------|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | Scripts only |

## Database Setup

Run the SQL migrations **in order** in your Supabase SQL Editor (Dashboard → SQL Editor → New Query):

1. `supabase/migrations/001_secure_employee_auth.sql` — Auth functions (PIN login, employee names)
2. `supabase/migrations/002_schema_policy_alignment.sql` — RLS policies, indexes, triggers
3. `supabase/migrations/003_ops_schedule_chat_dashboard.sql` — Shifts, feeding, chat, checklists
4. `supabase/migrations/004_admin_employee_pin_access.sql` — Admin PIN access
5. `supabase/migrations/005_staff_auth_email_rpc.sql` — Staff auth email lookup
6. `supabase/migrations/006_restrict_pin_login_to_employees.sql` — PIN login restricted to employees
7. `supabase/migrations/007_feeding_schedule_recurrence.sql` — Recurring feeding schedules
8. `supabase/migrations/008_unified_calendar.sql` — Calendar system with events and sharing
9. `supabase/migrations/009_storage_buckets.sql` — Storage policies for observation photos
10. `supabase/migrations/010_drop_planner_stage.sql` — Drop planner Kanban stages
11. `supabase/migrations/011_calendar_checklist_items.sql` — Calendar checklist fields
12. `supabase/migrations/012_status_history_and_unlisted.sql` — Animal status history and "Unlisted"
13. `supabase/migrations/013_sop_attachments_and_pin_login.sql` — SOP attachments + expanded PIN login roster

**Note:** The base tables (species, animals, employees, etc.) must be created first per the schema in `sundown-hq-supabase-guide.md` Section 3.

## Storage Buckets

Create these buckets in Supabase Dashboard → Storage:

| Bucket | Access | Max Size | Purpose |
|--------|--------|----------|---------|
| `observation-photos` | Public | 5 MB | Employee observation photos |
| `calendar-files` | Public | 10 MB | Calendar event attachments |
| `sop-files` | Public (dev/test) | 10 MB | SOP document and image attachments |

Storage policies are applied by migrations 009 and 013.

## Storage Security Rollout (Required Before Production)

Current testing posture keeps the three attachment buckets public for fast QA and sharing. This is acceptable for non-sensitive test content only.

Before production launch, harden storage:

1. Set `observation-photos`, `calendar-files`, and `sop-files` buckets to **Private**.
2. Replace public URL usage (`getPublicUrl`) with signed URL flow (`createSignedUrl`) in the app.
3. Keep role-based storage policies (admin upload/delete, authenticated read where appropriate).
4. Enable Vercel preview protection and add `noindex` for preview/staging environments.
5. Do not upload sensitive files until private-bucket + signed-URL flow is live.

### What Employees Need To Do

No workflow change is required for employees. They can continue to use name + PIN login. PIN login already creates an authenticated Supabase session behind the scenes, which is enough for private-bucket access.

## Admin Bootstrap

After creating your admin user in Supabase Auth (Dashboard → Auth → Users → Add User), link them to the employees table:

```sql
INSERT INTO employees (id, name, pin, role, is_active, assigned_buildings)
SELECT id, 'Your Name', '0000', 'super_admin', true, ARRAY['A','B']
FROM auth.users
WHERE email = 'your-admin@email.com'
ON CONFLICT (id) DO UPDATE SET role = 'super_admin', is_active = true;
```

Then log in at `/login?mode=admin` with your email and password.

## Running

```bash
npm run dev          # Dev server at http://localhost:3000
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build (includes PWA service worker) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Type check (`tsc --noEmit`) |
| `npm test` | Run Vitest suite |
| `npm run test:watch` | Run tests in watch mode |

## PWA

The app is installable as a Progressive Web App on employee phones. After deploying:

1. Open the app URL in Chrome/Safari on the employee's phone
2. Tap "Add to Home Screen" when prompted (or via browser menu)
3. The app caches its shell for fast loading and updates automatically

## CSV Import

Admin → Animals → Import CSV. The importer handles Bryan's inventory format with:
- Species carry-forward (species column only needs to appear on the first row of each group)
- Fuzzy gender normalization (NPV, poss male, probable female, etc.)
- Weight/price parsing with edge case handling
- Duplicate detection and warnings

## Deployment

Deploy on Vercel (Vite preset) or any static host:

- **Build command:** `npm run build`
- **Output dir:** `dist`
- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Framework preset:** Vite

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs typecheck, tests, and production build on every push/PR to `main`.

## Launch Readiness

See `docs/launch-checklist.md` for the v1 launch checklist and `docs/outstanding-items-plan.md` for the full implementation plan.
