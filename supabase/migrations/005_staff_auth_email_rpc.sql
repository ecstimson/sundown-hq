-- Migration: Expose staff auth emails to admins for profile visibility.
-- Read-only RPC used by Staff edit modal.

create or replace function get_staff_auth_emails()
returns table(id uuid, auth_email text)
language sql
security definer
stable
as $$
  select e.id, lower(u.email::text) as auth_email
  from employees e
  left join auth.users u on u.id = e.id
  where get_user_role() in ('admin', 'super_admin')
  order by e.name;
$$;

grant execute on function get_staff_auth_emails() to authenticated;
