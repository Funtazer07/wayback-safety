-- The grace period between "Are you OK?" and alerting the contacts becomes 3 minutes instead of 5.
--
-- Decided by the group on 26 Oct, after testing on real phones. 5 minutes came from the 05:00 on
-- screen 06 of the SCRUM-72 prototype and was an assumption until SCRUM-71 (research) decides.
-- Someone who does not answer within 3 minutes may need help, and their contacts should hear it
-- sooner. The "I'm okay · Add 5 minutes" button stays at 5 minutes: that is extra walking time,
-- not the grace period.
--
-- Three places must agree (docs/backend.md, "Late walks"): grace_period below, GRACE_MINUTES in
-- src/features/walk/grace.ts (the countdown on the screen) and GRACE_MINUTES in
-- supabase/functions/send-walk-push/walkPush.ts (the words of "Are you OK?").
--
-- check_late_walks from 0012, with only grace_period changed.

create or replace function public.check_late_walks()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- 3 minutes, decided on 26 Oct. Keep it the same as GRACE_MINUTES in src/features/walk/grace.ts
  -- and supabase/functions/send-walk-push/walkPush.ts.
  grace_period constant interval := interval '3 minutes';
  late_walk record;
begin
  -- Step 2 first, so a walk warned in this same run never jumps straight to overdue. The trigger
  -- from 0012 sends the alert to the contacts.
  update public.walks
  set status = 'overdue', overdue_at = now()
  where status = 'active'
    -- The warning was for the current deadline (not one from before an extension)...
    and warned_at >= deadline
    -- ...and the grace period after it is over.
    and warned_at + grace_period <= now();

  -- Step 1. "warned_at < deadline" also catches a walk that was extended after an earlier warning.
  for late_walk in
    update public.walks
    set warned_at = now()
    where status = 'active'
      and deadline <= now()
      and (warned_at is null or warned_at < deadline)
    returning id
  loop
    perform public.queue_walk_push(late_walk.id, 'are_you_ok');
  end loop;

  -- Step 3, unchanged from 0012: erase the last location 24 hours after the alert.
  update public.walks
  set last_lat = null, last_lng = null, last_location_at = null
  where status = 'overdue'
    and overdue_at <= now() - interval '24 hours'
    and last_location_at is not null;
end;
$$;

-- Same rights as before: only the database runs it (pg_cron, 0011).
revoke execute on function public.check_late_walks() from public, anon, authenticated;
