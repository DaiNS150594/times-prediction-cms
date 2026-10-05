-- FAM - TIMES: tournament landing settings + image storage
-- Run this once in Supabase SQL Editor.

create table if not exists public.tournament_settings (
  id integer primary key default 1 check (id = 1),
  title text not null default 'GIẢI ĐẤU',
  subtitle text not null default 'Chơi game bằng thực lực!',
  info_image_url text,
  info_image_path text,
  updated_at timestamptz default now()
);

insert into public.tournament_settings (id, title, subtitle)
values (1, 'GIẢI ĐẤU', 'Chơi game bằng thực lực!')
on conflict (id) do nothing;

alter table public.tournament_settings enable row level security;

drop policy if exists "Tournament settings are public readable" on public.tournament_settings;
create policy "Tournament settings are public readable"
on public.tournament_settings for select
using (true);

drop policy if exists "Tournament settings are writable" on public.tournament_settings;
create policy "Tournament settings are writable"
on public.tournament_settings for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('tournament-assets', 'tournament-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Tournament assets are public readable" on storage.objects;
create policy "Tournament assets are public readable"
on storage.objects for select
using (bucket_id = 'tournament-assets');

drop policy if exists "Tournament assets are writable" on storage.objects;
create policy "Tournament assets are writable"
on storage.objects for all
using (bucket_id = 'tournament-assets' and auth.role() = 'authenticated')
with check (bucket_id = 'tournament-assets' and auth.role() = 'authenticated');

