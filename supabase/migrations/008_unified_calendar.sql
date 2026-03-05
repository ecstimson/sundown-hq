-- Migration 008: Unified phone-style calendar system
-- Replaces split feeding_schedule / employee_shifts with a single event model.

-- ─── 1. Calendars ───
create table if not exists calendars (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  color text not null default '#D4A843',
  visibility text not null default 'team'
    check (visibility in ('private', 'team', 'public')),
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger calendars_updated_at
  before update on calendars
  for each row
  execute function update_updated_at();

-- ─── 2. Calendar members (who can see / edit each calendar) ───
create table if not exists calendar_members (
  id uuid primary key default uuid_generate_v4(),
  calendar_id uuid not null references calendars(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  role text not null default 'viewer'
    check (role in ('viewer', 'editor', 'owner')),
  created_at timestamptz default now(),
  unique (calendar_id, employee_id)
);

-- ─── 3. Calendar events ───
create table if not exists calendar_events (
  id uuid primary key default uuid_generate_v4(),
  calendar_id uuid not null references calendars(id) on delete cascade,
  title text not null,
  description text,
  location text,
  all_day boolean not null default false,
  start_at timestamptz not null,
  end_at timestamptz not null,
  repeat_rule text not null default 'none'
    check (repeat_rule in ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  repeat_interval integer not null default 1,
  repeat_until date,
  reminder_minutes integer[] not null default '{}',
  share_slug text unique,
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger calendar_events_updated_at
  before update on calendar_events
  for each row
  execute function update_updated_at();

-- ─── 4. Event attachments ───
create table if not exists event_attachments (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references calendar_events(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_size integer,
  mime_type text,
  uploaded_by uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);

-- ─── 5. Indexes ───
create index if not exists idx_calendar_members_calendar on calendar_members(calendar_id);
create index if not exists idx_calendar_members_employee on calendar_members(employee_id);
create index if not exists idx_calendar_events_calendar on calendar_events(calendar_id);
create index if not exists idx_calendar_events_start on calendar_events(start_at);
create index if not exists idx_calendar_events_end on calendar_events(end_at);
create index if not exists idx_calendar_events_repeat on calendar_events(repeat_rule);
create index if not exists idx_calendar_events_slug on calendar_events(share_slug) where share_slug is not null;
create index if not exists idx_event_attachments_event on event_attachments(event_id);

-- ─── 6. RLS ───
alter table calendars enable row level security;
alter table calendar_members enable row level security;
alter table calendar_events enable row level security;
alter table event_attachments enable row level security;

-- Calendars: admins see all; others see public + team calendars they are members of
drop policy if exists "calendars_admin_all" on calendars;
create policy "calendars_admin_all" on calendars for all using (
  get_user_role() in ('admin', 'super_admin')
);

drop policy if exists "calendars_member_read" on calendars;
create policy "calendars_member_read" on calendars for select using (
  visibility = 'public'
  or exists (
    select 1 from calendar_members cm
    where cm.calendar_id = calendars.id and cm.employee_id = auth.uid()
  )
);

-- Calendar members: admins manage all; others read own memberships
drop policy if exists "calendar_members_admin_all" on calendar_members;
create policy "calendar_members_admin_all" on calendar_members for all using (
  get_user_role() in ('admin', 'super_admin')
);

drop policy if exists "calendar_members_read_own" on calendar_members;
create policy "calendar_members_read_own" on calendar_members for select using (
  employee_id = auth.uid()
);

-- Events: admins manage all; members read events in their calendars; editors can write
drop policy if exists "calendar_events_admin_all" on calendar_events;
create policy "calendar_events_admin_all" on calendar_events for all using (
  get_user_role() in ('admin', 'super_admin')
);

drop policy if exists "calendar_events_member_read" on calendar_events;
create policy "calendar_events_member_read" on calendar_events for select using (
  exists (
    select 1 from calendar_members cm
    where cm.calendar_id = calendar_events.calendar_id and cm.employee_id = auth.uid()
  )
  or (share_slug is not null and auth.uid() is not null)
);

drop policy if exists "calendar_events_editor_write" on calendar_events;
create policy "calendar_events_editor_write" on calendar_events for insert with check (
  exists (
    select 1 from calendar_members cm
    where cm.calendar_id = calendar_events.calendar_id
      and cm.employee_id = auth.uid()
      and cm.role in ('editor', 'owner')
  )
);

drop policy if exists "calendar_events_editor_update" on calendar_events;
create policy "calendar_events_editor_update" on calendar_events for update using (
  exists (
    select 1 from calendar_members cm
    where cm.calendar_id = calendar_events.calendar_id
      and cm.employee_id = auth.uid()
      and cm.role in ('editor', 'owner')
  )
);

drop policy if exists "calendar_events_editor_delete" on calendar_events;
create policy "calendar_events_editor_delete" on calendar_events for delete using (
  exists (
    select 1 from calendar_members cm
    where cm.calendar_id = calendar_events.calendar_id
      and cm.employee_id = auth.uid()
      and cm.role in ('editor', 'owner')
  )
);

-- Attachments: same visibility as the parent event
drop policy if exists "event_attachments_admin_all" on event_attachments;
create policy "event_attachments_admin_all" on event_attachments for all using (
  get_user_role() in ('admin', 'super_admin')
);

drop policy if exists "event_attachments_member_read" on event_attachments;
create policy "event_attachments_member_read" on event_attachments for select using (
  exists (
    select 1 from calendar_events ce
    join calendar_members cm on cm.calendar_id = ce.calendar_id
    where ce.id = event_attachments.event_id and cm.employee_id = auth.uid()
  )
);

drop policy if exists "event_attachments_editor_write" on event_attachments;
create policy "event_attachments_editor_write" on event_attachments for insert with check (
  exists (
    select 1 from calendar_events ce
    join calendar_members cm on cm.calendar_id = ce.calendar_id
    where ce.id = event_attachments.event_id
      and cm.employee_id = auth.uid()
      and cm.role in ('editor', 'owner')
  )
);

-- ─── 7. Seed default calendars ───
-- These run only if the table is empty (first deploy).
insert into calendars (id, name, color, visibility)
select '00000000-0000-0000-0000-000000000001', 'Operations', '#D4A843', 'team'
where not exists (select 1 from calendars where name = 'Operations');

insert into calendars (id, name, color, visibility)
select '00000000-0000-0000-0000-000000000002', 'Admin', '#4aa3d6', 'private'
where not exists (select 1 from calendars where name = 'Admin');

-- ─── 8. Backfill existing schedule data ───
-- Copy feeding_schedule rows into calendar_events under "Operations" calendar.
insert into calendar_events (calendar_id, title, description, all_day, start_at, end_at, repeat_rule, repeat_interval, repeat_until, created_by, created_at)
select
  '00000000-0000-0000-0000-000000000001',
  coalesce(fs.group_name, 'Feeding: ' || fs.feeding_type),
  concat_ws(' | ', nullif(fs.feeding_type, ''), nullif(fs.calcium_rotation, ''), fs.notes),
  case when fs.start_time is null then true else false end,
  (fs.schedule_date::date + coalesce(fs.start_time, '00:00'::time))::timestamptz,
  (fs.schedule_date::date + coalesce(fs.end_time, fs.start_time, '23:59'::time))::timestamptz,
  coalesce(fs.repeat_rule, 'none'),
  coalesce(fs.repeat_interval, 1),
  fs.repeat_until,
  fs.created_by,
  fs.created_at
from feeding_schedule fs
where not exists (
  select 1 from calendar_events ce where ce.title = coalesce(fs.group_name, 'Feeding: ' || fs.feeding_type)
    and ce.start_at = (fs.schedule_date::date + coalesce(fs.start_time, '00:00'::time))::timestamptz
    and ce.calendar_id = '00000000-0000-0000-0000-000000000001'
);

-- Copy employee_shifts rows into calendar_events under "Operations" calendar.
insert into calendar_events (calendar_id, title, description, all_day, start_at, end_at, created_by, created_at)
select
  '00000000-0000-0000-0000-000000000001',
  'Shift: ' || e.name || ' (' || es.shift_type || ')',
  es.notes,
  case when es.start_time is null then true else false end,
  (es.shift_date::date + coalesce(es.start_time, '00:00'::time))::timestamptz,
  (es.shift_date::date + coalesce(es.end_time, es.start_time, '23:59'::time))::timestamptz,
  es.created_by,
  es.created_at
from employee_shifts es
join employees e on e.id = es.employee_id
where not exists (
  select 1 from calendar_events ce
  where ce.title = 'Shift: ' || e.name || ' (' || es.shift_type || ')'
    and ce.start_at = (es.shift_date::date + coalesce(es.start_time, '00:00'::time))::timestamptz
    and ce.calendar_id = '00000000-0000-0000-0000-000000000001'
);

-- ─── 9. Auto-add all active employees as members of Operations calendar ───
insert into calendar_members (calendar_id, employee_id, role)
select '00000000-0000-0000-0000-000000000001', e.id,
  case when e.role in ('admin', 'super_admin') then 'owner' else 'editor' end
from employees e
where e.is_active = true
  and not exists (
    select 1 from calendar_members cm
    where cm.calendar_id = '00000000-0000-0000-0000-000000000001' and cm.employee_id = e.id
  );

-- Auto-add admins to Admin calendar
insert into calendar_members (calendar_id, employee_id, role)
select '00000000-0000-0000-0000-000000000002', e.id, 'owner'
from employees e
where e.is_active = true and e.role in ('admin', 'super_admin')
  and not exists (
    select 1 from calendar_members cm
    where cm.calendar_id = '00000000-0000-0000-0000-000000000002' and cm.employee_id = e.id
  );
