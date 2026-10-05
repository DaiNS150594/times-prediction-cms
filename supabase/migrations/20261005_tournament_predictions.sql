-- FAM - TIMES: tournament champion predictions
-- Run once in Supabase SQL Editor after the tournament teams migration.

create table if not exists public.tournament_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid not null references public.tournament_teams(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id)
);

create index if not exists idx_tournament_predictions_team_id
  on public.tournament_predictions(team_id);

alter table public.tournament_predictions enable row level security;

drop policy if exists "Tournament predictions are public readable" on public.tournament_predictions;
create policy "Tournament predictions are public readable"
on public.tournament_predictions for select
using (true);

drop policy if exists "Tournament predictions are writable by authenticated" on public.tournament_predictions;
create policy "Tournament predictions are writable by authenticated"
on public.tournament_predictions for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create or replace function public.submit_tournament_prediction_with_pin(
  p_user_id uuid,
  p_team_id uuid,
  p_pin_code text
)
returns public.tournament_predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
  v_team public.tournament_teams;
  v_remaining integer;
  v_prediction public.tournament_predictions;
begin
  select * into v_user from public.users where id = p_user_id;
  if not found then
    raise exception 'Người tham gia không tồn tại.';
  end if;

  if v_user.pin_code is null then
    raise exception 'Tài khoản này chưa được cấp PIN.';
  end if;

  if v_user.pin_code <> p_pin_code then
    raise exception 'PIN không đúng.';
  end if;

  select * into v_team from public.tournament_teams where id = p_team_id;
  if not found then
    raise exception 'Đội không tồn tại.';
  end if;

  if v_team.status = 'stopped' then
    raise exception 'Đội này đã dừng bước.';
  end if;

  select count(*) into v_remaining
  from public.tournament_teams
  where status <> 'stopped';

  if v_remaining <= 1 then
    raise exception 'Giải đấu không còn mở dự đoán đội vô địch.';
  end if;

  if exists (select 1 from public.tournament_predictions where user_id = p_user_id) then
    raise exception 'Bạn đã dự đoán đội vô địch rồi.';
  end if;

  insert into public.tournament_predictions(user_id, team_id)
  values (p_user_id, p_team_id)
  returning * into v_prediction;

  return v_prediction;
end;
$$;

alter table public.tournament_predictions replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.tournament_predictions;
exception
  when duplicate_object then null;
end $$;
