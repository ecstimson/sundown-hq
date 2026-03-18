-- Migration 019: Allow admin_create_employee to link existing auth users
--
-- Problem: If a user was added directly in Supabase Auth (dashboard),
-- they have an auth.users row but no employees row. The app only queries
-- the employees table, so these users are invisible. Worse, the old RPC
-- blocks re-adding them because the email already exists in auth.users.
--
-- Fix: When the auth email already exists, check whether an employees
-- row is already linked. If not, create the employees row using the
-- existing auth.users id.

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
  existing_auth_id uuid;
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

  -- Check if auth user already exists for this email
  select id into existing_auth_id
  from auth.users
  where lower(email) = lower(trim(p_email));

  if existing_auth_id is not null then
    -- Auth user exists; check if they already have an employee record
    if exists (select 1 from employees where id = existing_auth_id) then
      raise exception 'An employee with this email already exists';
    end if;

    -- Link the existing auth user to a new employee record
    insert into employees (id, name, pin, role, assigned_buildings, is_active)
    values (existing_auth_id, trim(p_name), p_pin, p_role, p_assigned_buildings, true);

    -- Update their auth password to match the PIN
    update auth.users
    set encrypted_password = crypt('sr-pin-' || p_pin, gen_salt('bf')),
        updated_at = now()
    where id = existing_auth_id;

    return existing_auth_id;
  end if;

  -- No existing auth user — create both records
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
