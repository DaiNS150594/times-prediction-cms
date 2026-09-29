-- Run once in Supabase > SQL Editor for the existing FAM - TIMES project.
-- This allows anonymous participants to submit one prediction per active event.
-- The existing unique(event_id, user_id) rule prevents a second submission.

alter table public.predictions
  drop constraint if exists predictions_two_digit_check;

alter table public.predictions
  add constraint predictions_two_digit_check
  check (prediction >= 0 and prediction <= 99 and prediction = trunc(prediction));

drop policy if exists "public submit prediction" on public.predictions;

create policy "public submit prediction"
on public.predictions
for insert
to anon
with check (
  prediction >= 0
  and prediction <= 99
  and prediction = trunc(prediction)
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.status = 'active'
  )
);
