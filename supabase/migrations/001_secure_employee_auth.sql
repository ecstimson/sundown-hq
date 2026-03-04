-- Migration: Secure employee authentication
-- Replaces direct client-side employees table queries with safe RPC functions.
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New Query).

-- 1. Public-safe employee name listing (callable by anon/authenticated)
-- Returns only names of active employees with 'employee' role — no PINs, no IDs.
create or replace function get_active_employee_names()
returns table(name text)
language sql
security definer
stable
as $$
  select e.name
  from employees e
  where e.is_active = true
    and e.role = 'employee'
  order by e.name;
$$;

-- Allow anon and authenticated users to call this function
grant execute on function get_active_employee_names() to anon, authenticated;

-- 2. PIN verification RPC (callable by anon)
-- Validates employee name + PIN server-side and returns the auth email on success.
-- Never exposes the PIN value to the client.
create or replace function verify_employee_pin(p_name text, p_pin text)
returns table(auth_email text)
language plpgsql
security definer
as $$
declare
  v_name text;
begin
  select e.name into v_name
  from employees e
  where e.name = p_name
    and e.pin = p_pin
    and e.is_active = true;

  if v_name is null then
    return;  -- empty result = invalid credentials
  end if;

  -- Derive the auth email using the same convention as the app
  auth_email := lower(replace(v_name, ' ', '-')) || '@sundown-hq.local';
  return next;
end;
$$;

-- Allow anon users to call this (needed for pre-auth login flow)
grant execute on function verify_employee_pin(text, text) to anon, authenticated;
