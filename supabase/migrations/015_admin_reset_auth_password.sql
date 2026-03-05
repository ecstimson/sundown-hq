-- Migration 015: Admin password sync
-- Allows admins to reset an employee's Supabase Auth password directly,
-- fixing login failures from out-of-sync PINs or unconfirmed emails.

create or replace function admin_reset_employee_password(
  p_employee_id uuid,
  p_new_password text
)
returns void
language plpgsql
security definer
as $$
declare
  caller_role text;
begin
  select role into caller_role
  from employees
  where id = auth.uid();

  if caller_role is null or caller_role not in ('admin', 'super_admin') then
    raise exception 'Only admins can reset employee passwords';
  end if;

  if not exists (select 1 from employees where id = p_employee_id) then
    raise exception 'Employee not found';
  end if;

  update auth.users
  set
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where id = p_employee_id;
end;
$$;

grant execute on function admin_reset_employee_password(uuid, text) to authenticated;
