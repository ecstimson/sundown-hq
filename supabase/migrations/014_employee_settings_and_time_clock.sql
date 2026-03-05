-- Migration 014: Employee settings profile and clock in/out tracking

-- ─── 1. Employee profile settings ───
create table if not exists employee_profiles (
  employee_id uuid primary key references employees(id) on delete cascade,
  avatar_url text,
  phone text,
  address text,
  w2_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists employee_profiles_updated_at on employee_profiles;
create trigger employee_profiles_updated_at
  before update on employee_profiles
  for each row
  execute function update_updated_at();

alter table employee_profiles enable row level security;

drop policy if exists "employee_profiles_read_own" on employee_profiles;
create policy "employee_profiles_read_own" on employee_profiles
  for select using (
    employee_id = auth.uid()
    or get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "employee_profiles_insert_own" on employee_profiles;
create policy "employee_profiles_insert_own" on employee_profiles
  for insert with check (
    employee_id = auth.uid()
    or get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "employee_profiles_update_own" on employee_profiles;
create policy "employee_profiles_update_own" on employee_profiles
  for update using (
    employee_id = auth.uid()
    or get_user_role() in ('admin', 'super_admin')
  ) with check (
    employee_id = auth.uid()
    or get_user_role() in ('admin', 'super_admin')
  );

-- ─── 2. Employee time clock entries ───
create table if not exists employee_time_entries (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  clock_in_at timestamptz not null default now(),
  clock_out_at timestamptz,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint employee_time_entries_clock_order
    check (clock_out_at is null or clock_out_at >= clock_in_at)
);

drop trigger if exists employee_time_entries_updated_at on employee_time_entries;
create trigger employee_time_entries_updated_at
  before update on employee_time_entries
  for each row
  execute function update_updated_at();

create index if not exists idx_employee_time_entries_employee on employee_time_entries(employee_id);
create index if not exists idx_employee_time_entries_clock_in on employee_time_entries(clock_in_at desc);
create unique index if not exists idx_employee_time_entries_open_unique
  on employee_time_entries(employee_id) where clock_out_at is null;

alter table employee_time_entries enable row level security;

drop policy if exists "employee_time_entries_read_own" on employee_time_entries;
create policy "employee_time_entries_read_own" on employee_time_entries
  for select using (
    employee_id = auth.uid()
    or get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "employee_time_entries_insert_own" on employee_time_entries;
create policy "employee_time_entries_insert_own" on employee_time_entries
  for insert with check (
    employee_id = auth.uid()
    or get_user_role() in ('admin', 'super_admin')
  );

drop policy if exists "employee_time_entries_update_own_open" on employee_time_entries;
create policy "employee_time_entries_update_own_open" on employee_time_entries
  for update using (
    (employee_id = auth.uid() and clock_out_at is null)
    or get_user_role() in ('admin', 'super_admin')
  ) with check (
    employee_id = auth.uid()
    or get_user_role() in ('admin', 'super_admin')
  );

-- ─── 3. Avatar storage access (bucket must be created in dashboard) ───
-- Expected bucket: employee-avatars (public during dev/test or private with signed URLs later).
drop policy if exists "upload_employee_avatars" on storage.objects;
create policy "upload_employee_avatars" on storage.objects
  for insert with check (
    bucket_id = 'employee-avatars'
    and auth.role() = 'authenticated'
  );

drop policy if exists "view_employee_avatars" on storage.objects;
create policy "view_employee_avatars" on storage.objects
  for select using (
    bucket_id = 'employee-avatars'
    and auth.role() = 'authenticated'
  );

drop policy if exists "delete_employee_avatars" on storage.objects;
create policy "delete_employee_avatars" on storage.objects
  for delete using (
    bucket_id = 'employee-avatars'
    and auth.role() = 'authenticated'
  );
