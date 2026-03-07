-- Migration 016: Custom weekday recurrence
-- Adds support for repeating on specific days of the week (e.g. Mon/Wed/Thu).

-- 1. Add the `repeat_weekdays` column: array of weekday integers 0=Sun..6=Sat
alter table calendar_events
  add column if not exists repeat_weekdays smallint[] default null;

-- 2. Widen `repeat_rule` check to allow the new value
alter table calendar_events
  drop constraint if exists calendar_events_repeat_rule_check;

alter table calendar_events
  add constraint calendar_events_repeat_rule_check
    check (repeat_rule in ('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom_weekdays'));

-- 3. Validate weekday values (0–6 only) when the array is present
alter table calendar_events
  drop constraint if exists calendar_events_repeat_weekdays_values_check;

alter table calendar_events
  add constraint calendar_events_repeat_weekdays_values_check
    check (
      repeat_weekdays is null
      or (
        array_length(repeat_weekdays, 1) >= 1
        and repeat_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
      )
    );

-- 4. Ensure weekdays are provided iff rule is custom_weekdays
alter table calendar_events
  drop constraint if exists calendar_events_repeat_weekdays_required_check;

alter table calendar_events
  add constraint calendar_events_repeat_weekdays_required_check
    check (
      (repeat_rule = 'custom_weekdays' and repeat_weekdays is not null and array_length(repeat_weekdays, 1) >= 1)
      or (repeat_rule != 'custom_weekdays' and repeat_weekdays is null)
    );
