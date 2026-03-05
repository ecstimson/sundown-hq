-- Migration: Restrict PIN login flow to employee accounts only.
-- Admin and super_admin accounts must use email/password login.

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

grant execute on function get_active_employee_names() to anon, authenticated;

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
    and e.role = 'employee'
    and u.email is not null
  limit 1;
end;
$$;

grant execute on function verify_employee_pin(text, text) to anon, authenticated;
