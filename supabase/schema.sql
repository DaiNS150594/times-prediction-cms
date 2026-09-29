-- Run this entire file in Supabase > SQL Editor for a fresh FAM - TIMES project.
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text,
  avatar_url text,
  pin_code text check (pin_code is null or pin_code ~ '^\d{4}$'),
  created_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date timestamptz,
  actual_result numeric,
  status text not null default 'active' check(status in ('active','closed')),
  created_at timestamptz default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  prediction numeric not null check(prediction >= 0 and prediction <= 99 and prediction = trunc(prediction)),
  created_at timestamptz default now(),
  unique(event_id,user_id)
);

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.predictions enable row level security;

create policy "public read users" on public.users for select using (true);
create policy "admin users" on public.users for all to authenticated using (true) with check (true);
create policy "public read events" on public.events for select using (true);
create policy "admin events" on public.events for all to authenticated using (true) with check (true);
create policy "public read predictions" on public.predictions for select using (true);
create policy "admin predictions" on public.predictions for all to authenticated using (true) with check (true);

-- Anonymous visitors may only read public user fields. PIN is intentionally excluded.
revoke select on public.users from anon;
grant select (id, name, nickname, avatar_url, created_at) on public.users to anon;
grant select on public.users to authenticated;

-- Anonymous visitors cannot insert/update/delete predictions directly.
-- Submissions must go through the PIN-checked RPC below.
revoke insert, update, delete on public.predictions from anon;

create or replace function public.submit_prediction_with_pin(
  p_event_id uuid,
  p_user_id uuid,
  p_pin_code text,
  p_prediction integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_user_pin text;
begin
  if p_pin_code !~ '^\d{4}$' then
    raise exception 'PIN phải gồm đúng 4 chữ số';
  end if;

  if p_prediction < 0 or p_prediction > 99 then
    raise exception 'Dự đoán phải từ 00 đến 99';
  end if;

  select status into v_status
  from public.events
  where id = p_event_id;

  if v_status is distinct from 'active' then
    raise exception 'Sự kiện hiện không còn mở';
  end if;

  select pin_code into v_user_pin
  from public.users
  where id = p_user_id;

  if v_user_pin is null then
    raise exception 'Người chơi này chưa được cấp PIN';
  end if;

  if v_user_pin <> p_pin_code then
    raise exception 'PIN không đúng';
  end if;

  if exists (
    select 1 from public.predictions
    where event_id = p_event_id and user_id = p_user_id
  ) then
    raise exception 'Người này đã gửi dự đoán cho sự kiện hiện tại';
  end if;

  insert into public.predictions (event_id, user_id, prediction)
  values (p_event_id, p_user_id, p_prediction);
end;
$$;

revoke all on function public.submit_prediction_with_pin(uuid, uuid, text, integer) from public;
grant execute on function public.submit_prediction_with_pin(uuid, uuid, text, integer) to anon, authenticated;

alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.predictions;
