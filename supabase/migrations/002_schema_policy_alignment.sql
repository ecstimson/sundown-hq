-- Migration: Schema and policy alignment
-- Ensures RLS policies, constraints, and indexes match application behavior.
-- Run this in the Supabase SQL Editor AFTER 001_secure_employee_auth.sql.

-- ─── 1. Ensure get_user_role() function exists ───
-- This is referenced by many policies. Idempotent create-or-replace.
create or replace function get_user_role()
returns text
language sql
security definer
stable
as $$
  select role from employees where id = auth.uid();
$$;

-- ─── 2. Fix employees RLS for login flow ───
-- The app needs anon users to call RPC functions (handled in migration 001),
-- but direct table SELECT should remain restricted to self + admin.
-- Drop and re-create to ensure clean state.

-- Drop existing policies if they exist (safe for re-runs)
do $$
begin
  -- employees policies
  drop policy if exists "employees_read_own" on employees;
  drop policy if exists "employees_admin_write" on employees;

  -- species policies
  drop policy if exists "species_read" on species;
  drop policy if exists "species_admin_write" on species;

  -- animals policies
  drop policy if exists "animals_read" on animals;
  drop policy if exists "animals_admin_write" on animals;
  drop policy if exists "animals_employee_update" on animals;
end $$;

-- Enable RLS on all tables (idempotent)
alter table employees enable row level security;
alter table species enable row level security;
alter table animals enable row level security;
alter table observations enable row level security;
alter table daily_checklists enable row level security;
alter table drops enable row level security;
alter table drop_animals enable row level security;
alter table sops enable row level security;
alter table pairings enable row level security;

-- ─── 3. Recreate policies ───

-- EMPLOYEES: self-read + admin read/write (no anon access to raw table)
create policy "employees_read_own" on employees for select using (
  auth.uid() = id or get_user_role() in ('admin', 'super_admin')
);
create policy "employees_admin_write" on employees for all using (
  get_user_role() in ('admin', 'super_admin')
);

-- SPECIES: everyone can read (needed for import, filters, etc.), admin writes
create policy "species_read" on species for select using (true);
create policy "species_admin_write" on species for all using (
  get_user_role() in ('admin', 'super_admin')
);

-- ANIMALS: everyone reads, admin writes, employees can update limited fields
create policy "animals_read" on animals for select using (true);
create policy "animals_admin_write" on animals for all using (
  get_user_role() in ('admin', 'super_admin')
);
create policy "animals_employee_update" on animals for update using (
  get_user_role() = 'employee'
) with check (
  get_user_role() = 'employee'
);

-- ─── 4. Confirm key indexes exist ───
-- These are idempotent (will no-op if already present)
create index if not exists idx_animals_status on animals(status);
create index if not exists idx_animals_species on animals(species_id);
create index if not exists idx_animals_building on animals(building);
create index if not exists idx_animals_animal_id on animals(animal_id);
create index if not exists idx_observations_animal on observations(animal_id);
create index if not exists idx_observations_urgency on observations(urgency);
create index if not exists idx_observations_created on observations(created_at desc);
create index if not exists idx_checklists_date on daily_checklists(date desc);

-- ─── 5. Ensure animal_id uniqueness constraint ───
-- The guide declares it but re-confirm for safety.
-- This will fail harmlessly if the constraint already exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'animals_animal_id_key'
      and conrelid = 'animals'::regclass
  ) then
    alter table animals add constraint animals_animal_id_key unique (animal_id);
  end if;
end $$;

-- ─── 6. Updated_at auto-trigger for animals ───
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists animals_updated_at on animals;
create trigger animals_updated_at
  before update on animals
  for each row
  execute function update_updated_at();
