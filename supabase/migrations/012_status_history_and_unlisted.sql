-- Migration 012: Add status_history to animals and 'Unlisted' status
-- status_history tracks every status change with timestamps so Bryan can
-- see the full lifecycle: Available > Hold > Listed > Sold, etc.
-- Format: [{status, changed_at, changed_by?}]

alter table animals
  add column if not exists status_history jsonb default '[]'::jsonb;

-- Seed current status as the first history entry for existing animals
update animals
set status_history = jsonb_build_array(
  jsonb_build_object(
    'status', status,
    'changed_at', coalesce(updated_at, created_at, now()),
    'changed_by', null
  )
)
where status_history = '[]'::jsonb or status_history is null;
