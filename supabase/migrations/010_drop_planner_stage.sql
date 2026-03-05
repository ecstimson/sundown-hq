-- Migration 010: Add stage column to drop_animals for Kanban workflow
alter table drop_animals
  add column if not exists stage text
  check (stage in ('candidates', 'prep', 'photo', 'ready'))
  default 'candidates';

create index if not exists idx_drop_animals_stage on drop_animals(stage);
create index if not exists idx_drop_animals_drop on drop_animals(drop_id);
