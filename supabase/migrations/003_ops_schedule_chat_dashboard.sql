-- Migration: Operations scheduling, realtime chat, and dashboard preferences
-- Run after 001 and 002.

-- Employee shifts calendar
create table if not exists employee_shifts (
  id uuid primary key default uuid_generate_v4(),
  shift_date date not null,
  employee_id uuid not null references employees(id) on delete cascade,
  shift_type text not null default 'General',
  start_time time,
  end_time time,
  notes text,
  created_by uuid references employees(id),
  created_at timestamptz default now()
);

create index if not exists idx_employee_shifts_date on employee_shifts(shift_date);
create index if not exists idx_employee_shifts_employee on employee_shifts(employee_id);

-- Feeding schedule with calcium rotation
create table if not exists feeding_schedule (
  id uuid primary key default uuid_generate_v4(),
  schedule_date date not null,
  animal_id uuid references animals(id) on delete set null,
  group_name text,
  feeding_type text not null default 'Regular',
  calcium_rotation text not null default 'None',
  notes text,
  completed boolean not null default false,
  completed_by uuid references employees(id),
  completed_at timestamptz,
  created_by uuid references employees(id),
  created_at timestamptz default now()
);

create index if not exists idx_feeding_schedule_date on feeding_schedule(schedule_date);
create index if not exists idx_feeding_schedule_completed on feeding_schedule(completed);

-- Realtime chat (single-channel for v1)
create table if not exists chat_messages (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references employees(id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists idx_chat_messages_created_at on chat_messages(created_at desc);

-- Per-user dashboard customization
create table if not exists dashboard_preferences (
  user_id uuid primary key references employees(id) on delete cascade,
  hidden_widgets text[] not null default '{}',
  widget_order text[] not null default '{}',
  updated_at timestamptz default now()
);

-- Checklist templates for admin authoring
create table if not exists checklist_templates (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  building text check (building in ('A', 'B')) not null,
  checklist_type text not null,
  items jsonb not null default '[]',
  is_active boolean not null default true,
  created_by uuid references employees(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_checklist_templates_building on checklist_templates(building);
create index if not exists idx_checklist_templates_active on checklist_templates(is_active);

-- Updated_at trigger reuse
drop trigger if exists dashboard_preferences_updated_at on dashboard_preferences;
create trigger dashboard_preferences_updated_at
  before update on dashboard_preferences
  for each row
  execute function update_updated_at();

drop trigger if exists checklist_templates_updated_at on checklist_templates;
create trigger checklist_templates_updated_at
  before update on checklist_templates
  for each row
  execute function update_updated_at();

-- RLS
alter table employee_shifts enable row level security;
alter table feeding_schedule enable row level security;
alter table chat_messages enable row level security;
alter table dashboard_preferences enable row level security;
alter table checklist_templates enable row level security;

-- Admin-managed ops tables
drop policy if exists "employee_shifts_read" on employee_shifts;
drop policy if exists "employee_shifts_write_admin" on employee_shifts;
create policy "employee_shifts_read" on employee_shifts for select using (true);
create policy "employee_shifts_write_admin" on employee_shifts for all using (
  get_user_role() in ('admin', 'super_admin')
);

drop policy if exists "feeding_schedule_read" on feeding_schedule;
drop policy if exists "feeding_schedule_write_admin" on feeding_schedule;
create policy "feeding_schedule_read" on feeding_schedule for select using (true);
create policy "feeding_schedule_write_admin" on feeding_schedule for all using (
  get_user_role() in ('admin', 'super_admin')
);

drop policy if exists "checklist_templates_read" on checklist_templates;
drop policy if exists "checklist_templates_write_admin" on checklist_templates;
create policy "checklist_templates_read" on checklist_templates for select using (true);
create policy "checklist_templates_write_admin" on checklist_templates for all using (
  get_user_role() in ('admin', 'super_admin')
);

-- Chat: all authenticated users can read/insert
drop policy if exists "chat_messages_read_auth" on chat_messages;
drop policy if exists "chat_messages_insert_auth" on chat_messages;
create policy "chat_messages_read_auth" on chat_messages for select using (auth.uid() is not null);
create policy "chat_messages_insert_auth" on chat_messages for insert with check (auth.uid() = author_id);

-- Dashboard preferences: owner or admin
drop policy if exists "dashboard_preferences_read" on dashboard_preferences;
drop policy if exists "dashboard_preferences_upsert_own" on dashboard_preferences;
create policy "dashboard_preferences_read" on dashboard_preferences for select using (
  auth.uid() = user_id or get_user_role() in ('admin', 'super_admin')
);
create policy "dashboard_preferences_upsert_own" on dashboard_preferences for all using (
  auth.uid() = user_id or get_user_role() in ('admin', 'super_admin')
) with check (
  auth.uid() = user_id or get_user_role() in ('admin', 'super_admin')
);

