-- Migration 018: Server-side employee creation
-- Fixes broken PIN login for newly added employees.
--
-- Problem: Client-side supabase.auth.signUp() replaces the admin's session
-- with the new user, causing the employees INSERT to fail RLS checks.
-- The auth account gets created but the employees row does not, so
-- verify_employee_pin (which JOINs both tables) returns nothing.
--
-- Solution: Single RPC that creates both the auth.users row and the
-- employees row in one transaction, running as security definer.

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

  return new_id;
end;
$$;

grant execute on function admin_create_employee(text, text, text, text, text[]) to authenticated;
