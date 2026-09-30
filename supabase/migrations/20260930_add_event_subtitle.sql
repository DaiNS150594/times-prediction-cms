-- Add event subtitle / competitors text to existing FAM - TIMES projects.
alter table public.events
  add column if not exists subtitle text;
