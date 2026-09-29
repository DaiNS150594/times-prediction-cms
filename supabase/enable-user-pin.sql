-- Run once in Supabase > SQL Editor for the existing FAM - TIMES project.
-- Safe upgrade from the previous public-prediction setup to PIN-protected submissions.

alter table public.users
  add column if not exists pin_code text;

alter table public.users
  drop constraint if exists users_pin_code_check;

alter table public.users
  add constraint users_pin_code_check
  check (pin_code is null or pin_code ~ '^\d{4}$');

alter table public.predictions
  drop constraint if exists predictions_two_digit_check;

alter table public.predictions
  add constraint predictions_two_digit_check
  check (prediction >= 0 and prediction <= 99 and prediction = trunc(prediction));

-- Disable direct anonymous prediction inserts.
drop policy if exists "public submit prediction" on public.predictions;
revoke insert, update, delete on public.predictions from anon;

-- Do not expose PIN values to public visitors.
revoke select on public.users from anon;
grant select (id, name, nickname, avatar_url, created_at) on public.users to anon;
grant select on public.users to authenticated;

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

  select status
  into v_status
  from public.events
  where id = p_event_id;

  if v_status is distinct from 'active' then
    raise exception 'Sự kiện hiện không còn mở';
  end if;

  select pin_code
  into v_user_pin
  from public.users
  where id = p_user_id;

  if v_user_pin is null then
    raise exception 'Người chơi này chưa được cấp PIN';
  end if;

  if v_user_pin <> p_pin_code then
    raise exception 'PIN không đúng';
  end if;

  if exists (
    select 1
    from public.predictions
    where event_id = p_event_id
      and user_id = p_user_id
  ) then
    raise exception 'Người này đã gửi dự đoán cho sự kiện hiện tại';
  end if;

  insert into public.predictions (event_id, user_id, prediction)
  values (p_event_id, p_user_id, p_prediction);
end;
$$;

revoke all on function public.submit_prediction_with_pin(uuid, uuid, text, integer) from public;
grant execute on function public.submit_prediction_with_pin(uuid, uuid, text, integer)
to anon, authenticated;
