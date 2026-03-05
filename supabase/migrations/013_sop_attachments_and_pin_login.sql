-- Migration 013: SOP attachments + expanded PIN login roster
-- 1) Adds normalized SOP attachment records.
-- 2) Allows active admin/super_admin accounts to appear in employee PIN selector.

-- ─── 1. SOP attachments table ───
create table if not exists sop_attachments (
  id uuid primary key default uuid_generate_v4(),
  sop_id uuid not null references sops(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_size integer,
  mime_type text,
  uploaded_by uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_sop_attachments_sop on sop_attachments(sop_id);

alter table sop_attachments enable row level security;

drop policy if exists "sop_attachments_read" on sop_attachments;
create policy "sop_attachments_read" on sop_attachments
  for select using (auth.uid() is not null);

drop policy if exists "sop_attachments_admin_insert" on sop_attachments;
create policy "sop_attachments_admin_insert" on sop_attachments
  for insert with check (get_user_role() in ('admin', 'super_admin'));

drop policy if exists "sop_attachments_admin_update" on sop_attachments;
create policy "sop_attachments_admin_update" on sop_attachments
  for update using (get_user_role() in ('admin', 'super_admin'));

drop policy if exists "sop_attachments_admin_delete" on sop_attachments;
create policy "sop_attachments_admin_delete" on sop_attachments
  for delete using (get_user_role() in ('admin', 'super_admin'));

-- ─── 2. Storage policies for SOP files bucket ───
-- Bucket name expected: sop-files (create bucket in Supabase Dashboard).
drop policy if exists "upload_sop_files" on storage.objects;
create policy "upload_sop_files" on storage.objects
  for insert with check (
    bucket_id = 'sop-files'
    and (select role from public.employees where id = auth.uid()) in ('admin', 'super_admin')
  );

drop policy if exists "view_sop_files" on storage.objects;
create policy "view_sop_files" on storage.objects
  for select using (
    bucket_id = 'sop-files'
    and auth.role() = 'authenticated'
  );

drop policy if exists "delete_sop_files" on storage.objects;
create policy "delete_sop_files" on storage.objects
  for delete using (
    bucket_id = 'sop-files'
    and (select role from public.employees where id = auth.uid()) in ('admin', 'super_admin')
  );

-- ─── 3. PIN login RPC behavior ───
-- Include all active staff in employee picker.
create or replace function get_active_employee_names()
returns table(name text)
language sql
security definer
stable
as $$
  select e.name
  from employees e
  where e.is_active = true
    and e.role in ('employee', 'admin', 'super_admin')
  order by e.name;
$$;

grant execute on function get_active_employee_names() to anon, authenticated;

-- Allow active staff of any role to PIN-auth (not only role='employee').
create or replace function verify_employee_pin(p_name text, p_pin text)
returns table(auth_email text)
language plpgsql
security definer
as $$
begin
  return query
  select lower(u.email::text) as auth_email
  from employees e
  join auth.users u on u.id = e.id
  where e.name = p_name
    and e.pin = p_pin
    and e.is_active = true
    and e.role in ('employee', 'admin', 'super_admin')
    and u.email is not null
  limit 1;
end;
$$;

grant execute on function verify_employee_pin(text, text) to anon, authenticated;
