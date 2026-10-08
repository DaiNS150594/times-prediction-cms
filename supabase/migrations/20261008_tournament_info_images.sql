create table if not exists public.tournament_info_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  image_path text not null,
  created_at timestamptz not null default now()
);

alter table public.tournament_info_images enable row level security;

drop policy if exists "tournament_info_images_select_public" on public.tournament_info_images;
create policy "tournament_info_images_select_public"
on public.tournament_info_images for select
using (true);

drop policy if exists "tournament_info_images_write_authenticated" on public.tournament_info_images;
create policy "tournament_info_images_write_authenticated"
on public.tournament_info_images for all
to authenticated
using (true)
with check (true);

alter table public.tournament_info_images replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.tournament_info_images;
exception
  when duplicate_object then null;
end $$;

insert into public.tournament_info_images (image_url, image_path)
select info_image_url, info_image_path
from public.tournament_settings
where id = 1
  and info_image_url is not null
  and info_image_path is not null
  and not exists (
    select 1 from public.tournament_info_images
  );