-- Migration 021: Checklist template recurrence + daily_checklists template link
-- Adds repeat_rule / repeat_weekdays to checklist_templates so templates can
-- auto-generate daily_checklists rows on the correct days.

-- 1. Add repeat_rule column (daily = every day, custom_weekdays = specific days)
ALTER TABLE checklist_templates
  ADD COLUMN IF NOT EXISTS repeat_rule text NOT NULL DEFAULT 'daily';

ALTER TABLE checklist_templates
  DROP CONSTRAINT IF EXISTS checklist_templates_repeat_rule_check;

ALTER TABLE checklist_templates
  ADD CONSTRAINT checklist_templates_repeat_rule_check
    CHECK (repeat_rule IN ('daily', 'custom_weekdays'));

-- 2. Add repeat_weekdays column: array of weekday integers 0=Sun..6=Sat
ALTER TABLE checklist_templates
  ADD COLUMN IF NOT EXISTS repeat_weekdays smallint[] DEFAULT NULL;

ALTER TABLE checklist_templates
  DROP CONSTRAINT IF EXISTS checklist_templates_repeat_weekdays_values_check;

ALTER TABLE checklist_templates
  ADD CONSTRAINT checklist_templates_repeat_weekdays_values_check
    CHECK (
      repeat_weekdays IS NULL
      OR (
        array_length(repeat_weekdays, 1) >= 1
        AND repeat_weekdays <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]
      )
    );

ALTER TABLE checklist_templates
  DROP CONSTRAINT IF EXISTS checklist_templates_repeat_weekdays_required_check;

ALTER TABLE checklist_templates
  ADD CONSTRAINT checklist_templates_repeat_weekdays_required_check
    CHECK (
      (repeat_rule = 'custom_weekdays' AND repeat_weekdays IS NOT NULL AND array_length(repeat_weekdays, 1) >= 1)
      OR (repeat_rule != 'custom_weekdays' AND repeat_weekdays IS NULL)
    );

-- 3. Link daily_checklists back to the template that generated them
ALTER TABLE daily_checklists
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES checklist_templates(id) ON DELETE SET NULL;
