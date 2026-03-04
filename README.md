# Sundown HQ

Animal operations platform for Sundown Reptiles:
- Employee app (mobile-first workflows)
- Admin dashboard (inventory, staff, checklists, SOPs, drop planning)
- Supabase backend (Auth + Postgres + RLS)

## Requirements

- Node.js 18+ (Node 20 recommended)
- npm 9+
- Supabase project with SQL migrations applied

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create local env file:
   ```bash
   cp .env.example .env.local
   ```

3. Set required values in `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (scripts only)

4. Run SQL migrations in Supabase SQL Editor:
   - `supabase/migrations/001_secure_employee_auth.sql`
   - `supabase/migrations/002_schema_policy_alignment.sql`

5. Start app:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Admin Bootstrap (Required Once)

After creating your admin user in Supabase Auth, create matching `employees` row using the same UUID:

```sql
INSERT INTO employees (id, name, pin, role, is_active, assigned_buildings)
SELECT id, 'Admin User', '0000', 'super_admin', true, ARRAY['A','B']
FROM auth.users
WHERE email = 'your-admin@email.com'
ON CONFLICT (id) DO UPDATE SET role = 'super_admin', is_active = true;
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Type check (`tsc --noEmit`) |
| `npm test` | Run Vitest suite |
| `npm run test:watch` | Run tests in watch mode |

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs:
- typecheck
- tests
- production build

on every push/PR to `main`.

## Launch Readiness

See `docs/launch-checklist.md` for the v1 launch checklist.

## Deployment

Deploy on Vercel (Vite preset) or any static host:
- build command: `npm run build`
- output dir: `dist`
- required env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
