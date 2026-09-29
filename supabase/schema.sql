-- Run this entire file in Supabase > SQL Editor
create extension if not exists pgcrypto;
create table if not exists public.users (id uuid primary key default gen_random_uuid(), name text not null, nickname text, avatar_url text, created_at timestamptz default now());
create table if not exists public.events (id uuid primary key default gen_random_uuid(), title text not null, event_date timestamptz, actual_result numeric, status text not null default 'active' check(status in ('active','closed')), created_at timestamptz default now());
create table if not exists public.predictions (id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade, user_id uuid not null references public.users(id) on delete cascade, prediction numeric not null check(prediction >= 0 and prediction <= 99 and prediction = trunc(prediction)), created_at timestamptz default now(), unique(event_id,user_id));
alter table public.users enable row level security; alter table public.events enable row level security; alter table public.predictions enable row level security;
create policy "public read users" on public.users for select using (true); create policy "admin users" on public.users for all to authenticated using (true) with check (true);
create policy "public read events" on public.events for select using (true); create policy "admin events" on public.events for all to authenticated using (true) with check (true);
create policy "public read predictions" on public.predictions for select using (true);
create policy "public submit prediction" on public.predictions for insert to anon with check (
  prediction >= 0 and prediction <= 99 and prediction = trunc(prediction)
  and exists (select 1 from public.events e where e.id = event_id and e.status = 'active')
);
create policy "admin predictions" on public.predictions for all to authenticated using (true) with check (true);
alter publication supabase_realtime add table public.users; alter publication supabase_realtime add table public.events; alter publication supabase_realtime add table public.predictions;
