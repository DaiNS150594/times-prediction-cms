-- Add a live event link to existing FAM - TIMES projects.
alter table public.events
  add column if not exists event_link text;

