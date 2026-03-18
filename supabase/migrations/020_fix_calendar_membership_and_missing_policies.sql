-- Migration 020: Fix employee calendar visibility + add missing RLS policies
--
-- Problems fixed:
--   1. Employees created after migration 008 have no calendar_members rows,
--      so RLS blocks them from seeing any calendar events.
--   2. admin_create_employee does not add the new employee to any calendars.
--   3. Several tables (observations, daily_checklists, drops, drop_animals,
--      sops, pairings) have RLS enabled but no policies in migrations,
--      blocking all access.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Backfill: add missing employees to all team-visibility calendars
-- ═══════════════════════════════════════════════════════════════════════════

insert into calendar_members (calendar_id, employee_id, role)
select c.id, e.id,
  case when e.role in ('admin', 'super_admin') then 'owner' else 'editor' end
from calendars c
cross join employees e
where c.visibility = 'team'
  and e.is_active = true
  and not exists (
    select 1 from calendar_members cm
    where cm.calendar_id = c.id and cm.employee_id = e.id
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Update admin_create_employee to auto-add calendar memberships
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function admin_create_employee(
  p_name text,
  p_email text,
  p_pin text,
  p_role text,
  p_assigned_buildings text[]
)
returns uuid
language plpgsql
security definer
as $$
declare
  caller_role text;
  new_id uuid;
begin
  select role into caller_role
  from employees
  where id = auth.uid();

  if caller_role is null or caller_role not in ('admin', 'super_admin') then
    raise exception 'Only admins can create employees';
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception 'Name is required';
  end if;
  if p_email is null or trim(p_email) = '' then
    raise exception 'Email is required';
  end if;
  if p_pin is null or p_pin !~ '^\d{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  end if;
  if p_role not in ('employee', 'admin', 'super_admin') then
    raise exception 'Invalid role';
  end if;

  if exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then
    raise exception 'An account with this email already exists';
  end if;

  new_id := gen_random_uuid();

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token
  ) values (
    new_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    crypt('sr-pin-' || p_pin, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    ''
  );

  insert into employees (id, name, pin, role, assigned_buildings, is_active)
  values (new_id, trim(p_name), p_pin, p_role, p_assigned_buildings, true);

  -- Auto-add to all team-visibility calendars
  insert into calendar_members (calendar_id, employee_id, role)
  select c.id, new_id,
    case when p_role in ('admin', 'super_admin') then 'owner' else 'editor' end
  from calendars c
  where c.visibility = 'team';

  -- Auto-add admins to private calendars they should own
  if p_role in ('admin', 'super_admin') then
    insert into calendar_members (calendar_id, employee_id, role)
    select c.id, new_id, 'owner'
    from calendars c
    where c.visibility = 'private'
      and not exists (
        select 1 from calendar_members cm
        where cm.calendar_id = c.id and cm.employee_id = new_id
      );
  end if;

  return new_id;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Add missing RLS policies for employee-facing tables
--    These tables had RLS enabled in migration 002 but no policies created.
-- ═══════════════════════════════════════════════════════════════════════════

-- OBSERVATIONS: everyone can read, authenticated users insert their own
drop policy if exists "observations_read" on observations;
create policy "observations_read" on observations
  for select using (true);

drop policy if exists "observations_insert" on observations;
create policy "observations_insert" on observations
  for insert with check (auth.uid() = employee_id);

-- DAILY_CHECKLISTS: everyone can read, employees insert/update own or admin
drop policy if exists "checklists_read" on daily_checklists;
create policy "checklists_read" on daily_checklists
  for select using (true);

drop policy if exists "checklists_write" on daily_checklists;
create policy "checklists_write" on daily_checklists
  for insert with check (
    auth.uid() = employee_id
    or get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "checklists_update" on daily_checklists;
create policy "checklists_update" on daily_checklists
  for update using (
    auth.uid() = employee_id
    or get_user_role() in ('admin', 'super_admin')
  );

-- DROPS: everyone reads, admins write
drop policy if exists "drops_read" on drops;
create policy "drops_read" on drops
  for select using (true);

drop policy if exists "drops_write" on drops;
create policy "drops_write" on drops
  for all using (get_user_role() in ('admin', 'super_admin'));

-- DROP_ANIMALS: everyone reads, admins write
drop policy if exists "drop_animals_read" on drop_animals;
create policy "drop_animals_read" on drop_animals
  for select using (true);

drop policy if exists "drop_animals_write" on drop_animals;
create policy "drop_animals_write" on drop_animals
  for all using (get_user_role() in ('admin', 'super_admin'));

-- SOPS: everyone reads, admins write
drop policy if exists "sops_read" on sops;
create policy "sops_read" on sops
  for select using (true);

drop policy if exists "sops_write" on sops;
create policy "sops_write" on sops
  for all using (get_user_role() in ('admin', 'super_admin'));

-- PAIRINGS: everyone reads, admins write
drop policy if exists "pairings_read" on pairings;
create policy "pairings_read" on pairings
  for select using (true);

drop policy if exists "pairings_write" on pairings;
create policy "pairings_write" on pairings
  for all using (get_user_role() in ('admin', 'super_admin'));
