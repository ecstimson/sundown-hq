-- Migration 011: Add checklist_items to calendar_events
-- Allows events to carry interactive checklist items that employees can check off.
-- Format: [{id, label, completed, completed_by, completed_at}]

alter table calendar_events
  add column if not exists checklist_items jsonb default null;
