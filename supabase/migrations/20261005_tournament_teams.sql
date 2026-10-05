-- FAM - TIMES: tournament teams
-- Run this once in Supabase SQL Editor.

create table if not exists public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active'
    check (status in ('active','advanced','stopped')),
  created_at timestamptz default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.tournament_teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(team_id,user_id)
);

create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);

alter table public.tournament_teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "Tournament teams are public readable" on public.tournament_teams;
create policy "Tournament teams are public readable"
on public.tournament_teams for select
using (true);

drop policy if exists "Tournament teams are writable" on public.tournament_teams;
create policy "Tournament teams are writable"
on public.tournament_teams for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "Team members are public readable" on public.team_members;
create policy "Team members are public readable"
on public.team_members for select
using (true);

drop policy if exists "Team members are writable" on public.team_members;
create policy "Team members are writable"
on public.team_members for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

alter table public.tournament_teams replica identity full;
alter table public.team_members replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.tournament_teams;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.team_members;
exception
  when duplicate_object then null;
end $$;
