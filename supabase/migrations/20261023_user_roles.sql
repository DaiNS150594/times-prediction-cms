alter table public.users
  add column if not exists role text not null default 'Thành viên';

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('Chủ fam', 'Phó fam', 'Thành viên'));

update public.users
set role = 'Thành viên'
where role is null or role not in ('Chủ fam', 'Phó fam', 'Thành viên');
