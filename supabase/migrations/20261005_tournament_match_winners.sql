-- FAM - TIMES: store the admin-selected winner for each bracket match
alter table public.tournament_matches
  add column if not exists winner_team_id uuid references public.tournament_teams(id) on delete set null;

create index if not exists idx_tournament_matches_winner_team_id
  on public.tournament_matches(winner_team_id);

alter table public.tournament_matches replica identity full;
