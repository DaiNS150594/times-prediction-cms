-- FAM - TIMES: tournament bracket matches
create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  round text not null check (round in ('round_of_16','quarterfinal','semifinal','final')),
  match_order integer not null default 1,
  team1_id uuid references public.tournament_teams(id) on delete set null,
  team2_id uuid references public.tournament_teams(id) on delete set null,
  score1 integer,
  score2 integer,
  match_time timestamptz,
  created_at timestamptz default now(),
  unique(round, match_order)
);

create index if not exists idx_tournament_matches_round_order
  on public.tournament_matches(round, match_order);

alter table public.tournament_matches enable row level security;

drop policy if exists "Tournament matches are public readable" on public.tournament_matches;
create policy "Tournament matches are public readable"
on public.tournament_matches for select
using (true);

drop policy if exists "Tournament matches are writable by authenticated" on public.tournament_matches;
create policy "Tournament matches are writable by authenticated"
on public.tournament_matches for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

alter table public.tournament_matches replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.tournament_matches;
exception
  when duplicate_object then null;
end $$;
