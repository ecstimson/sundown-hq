## SQL Login Recovery Record (2026-03-05)

This file records the exact SQL statements used during production login troubleshooting for Bryan and Eric.

### 1) Diagnostic query (employees/auth link + confirmation state)

```sql
select
  e.name,
  e.id as employee_id,
  e.role,
  e.is_active,
  e.pin,
  u.id as auth_user_id,
  u.email,
  u.email_confirmed_at
from public.employees e
left join auth.users u on u.id = e.id
where lower(e.name) in ('bryan', 'eric');
```

### 2) Sync both users to PIN-derived auth password and confirm email if missing

```sql
update auth.users u
set
  encrypted_password = crypt('sr-pin-' || e.pin, gen_salt('bf')),
  email_confirmed_at = coalesce(u.email_confirmed_at, now()),
  updated_at = now()
from public.employees e
where u.id = e.id
  and lower(e.name) in ('bryan', 'eric');
```

### 3) Bryan-specific reset (targeted follow-up)

```sql
update auth.users
set
  encrypted_password = crypt('sr-pin-9000', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where id = 'a752ef70-812b-4c08-ae14-cf777a20c4f1';
```

### Notes

- Employee PIN login and admin login both rely on Supabase Auth credentials.
- PIN login uses the employee PIN to derive the auth password format: `sr-pin-<pin>`.
- If login behavior diverges by mode, verify `employees.pin` and `auth.users.encrypted_password` are in sync.
