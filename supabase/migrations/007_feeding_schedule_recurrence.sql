-- Migration: Add calendar-style recurrence metadata to feeding_schedule events
-- Enables Google Calendar-like repeating event support in Operations Schedule.

alter table if exists feeding_schedule
  add column if not exists start_time time;

alter table if exists feeding_schedule
  add column if not exists end_time time;

alter table if exists feeding_schedule
  add column if not exists repeat_rule text not null default 'none';

alter table if exists feeding_schedule
  add column if not exists repeat_interval integer not null default 1;

alter table if exists feeding_schedule
  add column if not exists repeat_until date;

create index if not exists idx_feeding_schedule_repeat_rule on feeding_schedule(repeat_rule);
create index if not exists idx_feeding_schedule_repeat_until on feeding_schedule(repeat_until);
