# Sundown HQ — Supabase Implementation Guide
## Architecture Migration: Google Sheets → Supabase (Primary) + Google Sheets (Backup)
## March 3, 2026

---

## What Changed From the Original PRD

The original PRD uses Google Sheets as the primary database with n8n as API middleware for every read/write. This guide replaces that with:

- **Supabase Postgres** as the primary database (direct client SDK calls)
- **Supabase Auth** for real authentication (PIN-based UX preserved)
- **Supabase Storage** for observation photos (replaces Vercel Blob)
- **Supabase Realtime** for live dashboard updates
- **Google Sheets** as the backup/export layer (synced via n8n)
- **n8n** handles only: Sheets sync, Shopify/MorphMarket CSV generation, urgent alerts, Shopify webhooks

Everything else in the PRD (features, UI specs, scoring algorithm, drop types, SOPs, checklists) stays exactly the same. This guide covers only the technical architecture changes.

---

## 1. Updated Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 19 + Vite 6 + Tailwind 4 + Lucide | Keep current setup |
| **PWA** | vite-plugin-pwa | Installable, service worker for app shell |
| **Hosting** | Vercel | Auto-deploy from GitHub |
| **Database** | Supabase (Postgres) | Primary source of truth |
| **Auth** | Supabase Auth | Email/password for admin, custom PIN flow for employees |
| **Photo Storage** | Supabase Storage | Observation photos, 1GB free tier |
| **Realtime** | Supabase Realtime | Live checklist status, urgent alerts |
| **Backup** | Google Sheets (via n8n sync) | Bryan always has spreadsheet access |
| **Automation** | n8n (Railway) | Sync, CSV generation, webhooks, notifications |

### Updated Data Flow
```
Employee PWA ──→ Supabase (direct via @supabase/supabase-js)
                    │
Admin Dashboard ────┘
                    │
         ┌──────────┼──────────┐
         ↓          ↓          ↓
   Supabase DB  Supabase    Supabase
   (Postgres)   Storage     Realtime
                (photos)    (live updates)
                    │
                    ↓
              n8n (Railway)
              ┌─────┼─────┐
              ↓     ↓     ↓
         Google  Shopify  Notifications
         Sheets  /MM CSV  (text/email)
         (backup) (export)
```

---

## 2. Supabase Project Setup

### Step 1: Create Project
1. Go to https://supabase.com → Sign in with GitHub
2. New Project → Name: `sundown-hq` → Region: `us-east-1` (closest to Charlotte)
3. Set a strong database password (save it somewhere secure)
4. Wait for project to provision (~2 minutes)

### Step 2: Get Your Keys
From Project Settings → API:
- **Project URL**: `https://xxxxx.supabase.co` → goes in `.env.local` as `VITE_SUPABASE_URL`
- **anon/public key**: → goes in `.env.local` as `VITE_SUPABASE_ANON_KEY`
- **service_role key**: → goes in n8n credentials (NOT in frontend code)

### Step 3: Install Client
```bash
npm install @supabase/supabase-js
```

### Step 4: Create Supabase Client
Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

---

## 3. Database Schema

Run these in Supabase SQL Editor (Dashboard → SQL Editor → New Query). Run them in order — tables reference each other.

### Enable UUID Extension
```sql
create extension if not exists "uuid-ossp";
```

### Table 1: species (lookup table)
```sql
create table species (
  id uuid primary key default uuid_generate_v4(),
  common_name text not null,
  scientific_name text not null,
  code text not null unique,  -- GG, CH, BTM, etc.
  is_new_caledonian boolean default false,  -- for parent image logic
  created_at timestamptz default now()
);

-- Seed species data
insert into species (common_name, scientific_name, code, is_new_caledonian) values
  ('Gargoyle Gecko', 'Rhacodactylus auriculatus', 'GG', true),
  ('Chahoua Gecko', 'Mniarogekko chahoua', 'CH', true),
  ('Crested Gecko', 'Correlophus ciliatus', 'CG', true),
  ('Leachianus', 'Rhacodactylus leachianus', 'LC', true),
  ('Blue Tree Monitor', 'Varanus macraei', 'BTM', false),
  ('Green Tree Monitor', 'Varanus prasinus', 'GTM', false),
  ('Yellow Tree Monitor', 'Varanus reisingeri', 'YTM', false),
  ('Pilbara Rock Monitor', 'Varanus pilbarensis', 'PRM', false),
  ('Abronia Graminea', 'Abronia graminea', 'AG', false),
  ('Abronia Taeniata', 'Abronia taeniata', 'AT', false),
  ('Rough Knob-Tailed Gecko', 'Nephrurus amyae', 'RKT', false),
  ('Northern Spiny-Tailed Gecko', 'Strophurus ciliaris', 'NST', false),
  ('Mourning Gecko', 'Lepidodactylus lugubris', 'MG', false),
  ('Chinese Cave Gecko', 'Goniurosaurus hainanensis', 'CCG', false),
  ('Vieillards Chameleon Gecko', 'Eurydactylodes vieillardi', 'VCG', true),
  ('Black Tree Monitor', 'Varanus beccarii', 'BKM', false),
  ('Biak Tree Monitor', 'Varanus kordensis', 'BIM', false),
  ('Eugenia Depressa', 'Eugenia depressa', 'ED', false);
```

### Table 2: pairings
```sql
create table pairings (
  id uuid primary key default uuid_generate_v4(),
  pairing_id text not null unique,  -- P-GG-042 format
  sire_id text,  -- references animal_id (text, not FK — animals may not exist yet)
  dam_id text,
  species_id uuid references species(id),
  status text check (status in ('Active', 'Retired')) default 'Active',
  total_clutches integer default 0,
  notes text,
  created_at timestamptz default now()
);
```

### Table 3: animals
```sql
create table animals (
  id uuid primary key default uuid_generate_v4(),
  animal_id text not null unique,  -- SR-GG-2025-0147 format
  species_id uuid references species(id) not null,
  gender text check (gender in ('Male', 'Female', 'Unsexed')) default 'Unsexed',
  pairing_id uuid references pairings(id),
  sire_animal_id text,  -- parent animal_id (text reference)
  dam_animal_id text,
  hatch_date date,
  current_weight_g numeric,
  last_weighed timestamptz,
  morph_traits text,  -- comma-separated
  price numeric,
  status text check (status in ('Breeder', 'Available', 'Hold', 'Listed', 'Sold', 'Archived')) default 'Available',
  shopify_product_id text,
  morphmarket_id text,
  date_listed timestamptz,
  date_sold timestamptz,
  buyer text,
  building text check (building in ('A', 'B')),
  rack_enclosure text,  -- A-3-14 format
  image_folder_url text,  -- Google Drive folder link
  notes text,
  listing_readiness_score numeric default 0,  -- 0-100, calculated
  last_observation_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for common queries
create index idx_animals_status on animals(status);
create index idx_animals_species on animals(species_id);
create index idx_animals_building on animals(building);
create index idx_animals_animal_id on animals(animal_id);
```

### Table 4: observations
```sql
create table observations (
  id uuid primary key default uuid_generate_v4(),
  animal_id uuid references animals(id) not null,
  employee_id uuid references auth.users(id) not null,
  employee_name text not null,  -- denormalized for easy display
  observation_type text check (observation_type in (
    'Feeding', 'Weight', 'Health Concern', 'Behavior', 'Shedding', 'Egg-Breeding', 'General Note'
  )) not null,
  details text not null,
  urgency text check (urgency in ('Routine', 'Needs Attention', 'Urgent')) default 'Routine',
  photo_urls text[],  -- array of Supabase Storage URLs
  created_at timestamptz default now()
);

create index idx_observations_animal on observations(animal_id);
create index idx_observations_urgency on observations(urgency);
create index idx_observations_created on observations(created_at desc);
```

### Table 5: daily_checklists
```sql
create table daily_checklists (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  building text check (building in ('A', 'B')) not null,
  checklist_type text check (checklist_type in (
    'Opening', 'Feeding-AM', 'Feeding-PM', 'Closing', 'Weekly'
  )) not null,
  employee_id uuid references auth.users(id) not null,
  employee_name text not null,
  completed_at timestamptz,
  items jsonb not null default '[]',  -- [{task_id, label, completed, timestamp, value}]
  notes text,
  created_at timestamptz default now(),

  unique(date, building, checklist_type)  -- one checklist per type per building per day
);

create index idx_checklists_date on daily_checklists(date desc);
```

### Table 6: drops
```sql
create table drops (
  id uuid primary key default uuid_generate_v4(),
  drop_id text not null unique,  -- DROP-2026-03 format
  drop_date date not null,
  status text check (status in ('Planning', 'Prep', 'Listed', 'Complete')) default 'Planning',
  drop_type text check (drop_type in ('Monthly', 'Tax Season', 'Black Friday', 'Vault Rotation')) default 'Monthly',
  discount_code text,
  notes text,
  created_at timestamptz default now()
);

-- Junction table for drop ↔ animals (many-to-many)
create table drop_animals (
  id uuid primary key default uuid_generate_v4(),
  drop_id uuid references drops(id) on delete cascade,
  animal_id uuid references animals(id),
  unique(drop_id, animal_id)
);
```

### Table 7: sops
```sql
create table sops (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category text not null,
  content text not null,  -- markdown
  sort_order integer default 0,
  image_urls text[],
  version integer default 1,
  previous_version_content text,  -- simple version history
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Table 8: employees (profile extension)
```sql
create table employees (
  id uuid primary key references auth.users(id),
  name text not null,
  pin text not null,  -- 4-digit PIN (hashed in practice)
  assigned_buildings text[] default '{"A","B"}',
  role text check (role in ('super_admin', 'admin', 'employee')) default 'employee',
  is_active boolean default true,
  created_at timestamptz default now()
);
```

### Auto-update timestamps
```sql
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger animals_updated_at before update on animals
  for each row execute function update_updated_at();

create trigger sops_updated_at before update on sops
  for each row execute function update_updated_at();
```

### Auto-update animal's last_observation_date
```sql
create or replace function update_animal_observation_date()
returns trigger as $$
begin
  update animals set last_observation_date = now() where id = new.animal_id;
  return new;
end;
$$ language plpgsql;

create trigger observation_updates_animal after insert on observations
  for each row execute function update_animal_observation_date();
```

---

## 4. Row-Level Security (RLS)

This is what makes Supabase secure. Employees can only do what they should.

```sql
-- Enable RLS on all tables
alter table animals enable row level security;
alter table observations enable row level security;
alter table daily_checklists enable row level security;
alter table drops enable row level security;
alter table drop_animals enable row level security;
alter table sops enable row level security;
alter table employees enable row level security;
alter table species enable row level security;
alter table pairings enable row level security;

-- Helper: get current user's role
create or replace function get_user_role()
returns text as $$
  select role from employees where id = auth.uid();
$$ language sql security definer;

-- SPECIES: everyone can read
create policy "species_read" on species for select using (true);

-- PAIRINGS: everyone can read, admin+ can write
create policy "pairings_read" on pairings for select using (true);
create policy "pairings_write" on pairings for all using (get_user_role() in ('admin', 'super_admin'));

-- ANIMALS: everyone can read, employees can update weight/notes, admin+ can do everything
create policy "animals_read" on animals for select using (true);
create policy "animals_admin_write" on animals for all using (get_user_role() in ('admin', 'super_admin'));
create policy "animals_employee_update" on animals for update using (
  get_user_role() = 'employee'
) with check (
  get_user_role() = 'employee'
  -- employees can only update these columns (enforced in app logic too)
);

-- OBSERVATIONS: everyone can read, authenticated users can insert their own
create policy "observations_read" on observations for select using (true);
create policy "observations_insert" on observations for insert with check (
  auth.uid() = employee_id
);

-- CHECKLISTS: everyone can read, authenticated users can insert/update
create policy "checklists_read" on daily_checklists for select using (true);
create policy "checklists_write" on daily_checklists for insert with check (
  auth.uid() = employee_id
);
create policy "checklists_update" on daily_checklists for update using (
  auth.uid() = employee_id or get_user_role() in ('admin', 'super_admin')
);

-- DROPS: everyone can read, admin+ can write
create policy "drops_read" on drops for select using (true);
create policy "drops_write" on drops for all using (get_user_role() in ('admin', 'super_admin'));
create policy "drop_animals_read" on drop_animals for select using (true);
create policy "drop_animals_write" on drop_animals for all using (get_user_role() in ('admin', 'super_admin'));

-- SOPS: everyone can read, admin+ can write
create policy "sops_read" on sops for select using (true);
create policy "sops_write" on sops for all using (get_user_role() in ('admin', 'super_admin'));

-- EMPLOYEES: users can read their own, admin+ can read/write all
create policy "employees_read_own" on employees for select using (
  auth.uid() = id or get_user_role() in ('admin', 'super_admin')
);
create policy "employees_admin_write" on employees for all using (
  get_user_role() in ('admin', 'super_admin')
);
```

---

## 5. Authentication

### How It Works

**Admin (Bryan + you):** Standard email/password login via Supabase Auth.

**Employees:** PIN-based login. The UX stays the same as the PRD describes (select name, enter PIN). Under the hood:
1. Each employee gets a Supabase Auth account (email: `{name}@sundown-hq.local`, auto-generated password)
2. When employee selects name + enters PIN, the app validates the PIN against the `employees` table
3. On match, the app signs in via the stored credentials
4. Session persists via Supabase's built-in session management

### Setup
Bryan creates employees via admin dashboard → app creates Supabase Auth user + employees table row.

### Auth Context
Create `src/lib/auth.tsx`:
```typescript
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContext {
  user: User | null
  session: Session | null
  employee: Employee | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithPin: (name: string, pin: string) => Promise<void>
  signOut: () => Promise<void>
}

// Implementation in the actual project
```

---

## 6. Supabase Storage (Photos)

### Setup
1. Supabase Dashboard → Storage → New Bucket: `observation-photos`
2. Set to **public** (photos need to be viewable in the app)
3. Set max file size: 5MB

### Storage Policies
```sql
-- Allow authenticated users to upload to observation-photos
create policy "upload_observation_photos" on storage.objects
  for insert with check (
    bucket_id = 'observation-photos'
    and auth.role() = 'authenticated'
  );

-- Allow anyone to view observation photos
create policy "view_observation_photos" on storage.objects
  for select using (bucket_id = 'observation-photos');
```

### Upload Pattern
```typescript
const uploadPhoto = async (file: File, animalId: string) => {
  const fileName = `${animalId}/${Date.now()}-${file.name}`
  const { data, error } = await supabase.storage
    .from('observation-photos')
    .upload(fileName, file)

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('observation-photos')
    .getPublicUrl(fileName)

  return publicUrl
}
```

---

## 7. Realtime Subscriptions

Bryan sees live updates on the admin dashboard without refreshing.

```typescript
// Admin dashboard: live checklist completion status
const channel = supabase
  .channel('checklist-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'daily_checklists',
    filter: `date=eq.${today}`
  }, (payload) => {
    // Update UI with new checklist data
  })
  .subscribe()

// Admin dashboard: urgent observation alerts
const urgentChannel = supabase
  .channel('urgent-alerts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'observations',
    filter: 'urgency=eq.Urgent'
  }, (payload) => {
    // Show alert notification
  })
  .subscribe()
```

---

## 8. n8n Integration (Simplified)

n8n's role shrinks significantly. It no longer handles every read/write — just background sync and integrations.

### Workflow 1: Supabase → Google Sheets Sync
**Trigger:** Scheduled (every 15 minutes) OR webhook on data change
**Action:** Read from Supabase tables → write to corresponding Google Sheets tabs
**Purpose:** Bryan always has spreadsheet access as a backup

### Workflow 2: Generate Shopify CSV
**Trigger:** Webhook from admin dashboard "Generate Shopify CSV" button
**Action:** Query drop animals from Supabase → format into Shopify CSV spec → write to Google Sheets "Shopify CSV Export" tab
**Purpose:** Bryan downloads CSV from Sheets → uploads to Shopify

### Workflow 3: Generate MorphMarket CSV
**Trigger:** Webhook from admin dashboard "Generate MorphMarket CSV" button
**Action:** Same pattern as Shopify but formatted for MorphMarket spec
**Purpose:** Bryan downloads TSV → uploads to MorphMarket

### Workflow 4: Shopify Order Webhook
**Trigger:** Shopify order.created webhook
**Action:** Update animal status to "Sold" in Supabase, fill date_sold + buyer

### Workflow 5: Urgent Alert Notification
**Trigger:** Supabase webhook on observation insert where urgency = 'Urgent'
**Action:** Send text/email to Bryan

### n8n Supabase Connection
In n8n, add credentials:
- **Type:** Supabase
- **Host:** Your Supabase project URL
- **Service Role Key:** The service_role key (has full access, bypasses RLS)

---

## 9. Environment Variables

### Frontend (.env.local)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### n8n (Railway environment)
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  (service role, NOT anon)
```

---

## 10. Migration Path — Bryan's Existing Data

Bryan has ~1,000 animals in a local database on his laptop. To get them into Supabase:

1. **Export from current system** → CSV
2. **Clean/format the CSV** to match the animals table columns
3. **Import via Supabase Dashboard** → Table Editor → Import CSV
4. Or use a one-time n8n workflow: read CSV → insert into Supabase

The animal IDs (SR-GG-2025-0147 format) are preserved. Nothing changes from Bryan's perspective.

---

## 11. Implementation Order

Work through these in sequence. Each step builds on the previous one.
Status below was reviewed on 2026-03-05 against the current codebase/runtime.

### Phase 1: Foundation (Day 1)
- [x] Create Supabase project
- [x] Run all SQL schema (tables, indexes, triggers)
- [x] Set up RLS policies
- [ ] Create storage bucket
- [x] Install @supabase/supabase-js
- [x] Create supabase client (`src/lib/supabase.ts`)
- [x] Add env vars to `.env.local`

### Phase 2: Auth (Day 1-2)
- [x] Create auth context/provider
- [x] Wire up admin login (email/password)
- [x] Wire up employee PIN login
- [x] Create employee account management in admin dashboard
- [x] Add route protection (redirect unauthenticated users)

### Phase 3: Core Data (Day 2-3)
- [x] Replace mock animal data with Supabase queries
- [x] Wire up animal list (search, filter, sort)
- [x] Wire up animal detail view
- [x] Wire up animal CRUD (admin)
- [x] Wire up weight updates (employee)
- [x] Wire up notes append (employee)

### Phase 4: Observations (Day 3-4)
- [x] Wire up observation form → Supabase insert
- [ ] Wire up photo upload → Supabase Storage
- [x] Wire up observation history on animal detail
- [x] Wire up urgent alert display

### Phase 5: Checklists (Day 4-5)
- [x] Wire up checklist templates (define items)
- [x] Wire up checklist completion flow (employee)
- [x] Wire up checklist review (admin)
- [ ] Add Realtime subscription for live status

### Phase 6: Drop Planner (Day 5-7)
- [ ] Wire up listing readiness score calculation
- [ ] Wire up drop creation and animal assignment
- [ ] Wire up drop status workflow (Planning → Prep → Listed → Complete)
- [ ] Wire up Shopify/MorphMarket CSV generation (via n8n webhook)

### Phase 7: SOPs (Day 7)
- [x] Wire up SOP CRUD (admin)
- [x] Wire up SOP library (employee, read-only)
- [x] Wire up SOP search

### Phase 8: n8n Sync (Day 7-8)
- [ ] Build Supabase → Google Sheets sync workflow
- [ ] Build Shopify CSV generation workflow
- [ ] Build MorphMarket CSV generation workflow
- [ ] Build Shopify order webhook → Supabase update
- [ ] Build urgent alert notification workflow

### Phase 9: Polish (Day 8-10)
- [ ] PWA setup (vite-plugin-pwa, manifest, icons)
- [x] Import Bryan's existing animal data
- [x] Test with real data
- [x] Dark theme matching sundownreptiles.com

---

## 12. What Stays The Same

Everything in the original PRD that isn't about the database layer:
- All UI specs (employee PWA + admin dashboard)
- Animal ID convention (SR-XX-YYYY-NNNN)
- Listing readiness scoring algorithm
- Drop types and workflow
- SOP categories and structure
- Checklist items and structure
- Google Drive photo library (listing photos — separate from observation photos)
- Shopify/MorphMarket CSV formats and workflows
- Non-functional requirements (load time, concurrent users, etc.)

Reference the original `sundown-hq-app-prd.md` for all feature/business logic details. This guide only covers the technical architecture changes.
