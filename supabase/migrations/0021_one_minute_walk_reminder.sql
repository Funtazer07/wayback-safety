-- SCRUM-64: user requested reminders one minute before the walk ends (27 Oct 2026).
-- Check every 10 seconds so normally 50–60 seconds remain when queued, not almost zero.
-- The server sends Web Push even while the app is closed or the phone is locked.
-- Keep the existing 5-minute timer colour and 3-minute late-walk grace period unchanged.
-- Deploy walkPush.ts with the 60-second eligibility and TTL before running this migration.
begin;

create or replace function public.check_walk_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_walk record;
begin
  for current_walk in
    select id, deadline from public.walks
    where status = 'active'
      and deadline > now()
      and deadline <= now() + interval '1 minute'
      and reminder_deadline is distinct from deadline
    -- Two overlapping runs cannot queue the same deadline twice. Extensions/check-ins use the
    -- same row lock. A new deadline is eligible again, without erasing any warning history.
    for update skip locked
  loop
    begin
      if public.queue_walk_reminder(current_walk.id, current_walk.deadline) then
        update public.walks set reminder_deadline = current_walk.deadline
        where id = current_walk.id;
      end if;
    exception when others then
      raise warning 'Could not queue a reminder for walk %: %', current_walk.id, sqlerrm;
    end;
  end loop;
end;
$$;

-- A running walk that received the old 5-minute reminder is eligible for the new timing.
update public.walks set reminder_deadline = null where status = 'active' and deadline > now();
revoke execute on function public.check_walk_reminders() from public, anon, authenticated;
select cron.schedule('check-walk-reminders', '10 seconds', 'select public.check_walk_reminders()');
commit;
