-- SCRUM-74: the alert to the contacts when a walk becomes overdue, and how long the last known
-- location is kept.
--
-- The scheduled check (0011_late_walks.sql) makes a walk 'overdue' when the user did not answer
-- "Are you OK?" within the grace period. From now on that change sends the alert to the walk's
-- contacts, through the same trigger and Edge Function as the other walk messages (0009). The
-- alert says when the last known location was saved and opens the walk in the app; it does not
-- carry the location itself.
--
-- If the user checks in afterwards (allowed on an overdue walk, 0004), the existing "home safe"
-- message goes out; the Edge Function words it as "is safe" after an alert.
--
-- Decided on 25 Oct, until SCRUM-71 (research) and SCRUM-30 decide for real: the last known
-- location of an overdue walk is erased 24 hours after the walk became overdue. Before this file a
-- walk that was never checked in kept its location forever.

-- The trigger function from 0011, with 'overdue' added. The names match WalkEvent in
-- supabase/functions/send-walk-push/walkPush.ts.
create or replace function public.send_walk_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.queue_walk_push(
    new.id,
    case
      when tg_op = 'INSERT' then 'started'
      when new.status = 'safe' then 'home_safe'
      when new.status = 'overdue' then 'overdue'
      else 'cancelled'
    end
  );
  return new;
end;
$$;

-- The same trigger as in 0009, now also for 'overdue'. Each status change sends once: the check
-- only makes an active walk overdue, and only once (0011).
drop trigger walks_push_when_ended on public.walks;

create trigger walks_push_when_ended
  after update of status on public.walks
  for each row
  when (new.status in ('safe', 'cancelled', 'overdue') and old.status is distinct from new.status)
  execute function public.send_walk_push();

-- The check from 0011 with a third step: erasing old locations.
create or replace function public.check_late_walks()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Assumption: 5 minutes, from the 05:00 on the SCRUM-72 prototype, until SCRUM-71 (research)
  -- decides. Keep it the same as GRACE_MINUTES in supabase/functions/send-walk-push/walkPush.ts,
  -- which tells the user how long they have.
  grace_period constant interval := interval '5 minutes';
  late_walk record;
begin
  -- Step 2 first, so a walk warned in this same run never jumps straight to overdue. The trigger
  -- above sends the alert to the contacts.
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

  -- Step 3. Assumption: a day after the alert, the contacts have looked where the user last was,
  -- or the alert is old news. Keeping the location longer only adds risk. Decided on 25 Oct until
  -- SCRUM-71 / SCRUM-30 decide.
  update public.walks
  set last_lat = null, last_lng = null, last_location_at = null
  where status = 'overdue'
    and overdue_at <= now() - interval '24 hours'
    and last_location_at is not null;
end;
$$;

-- update_walk_location (0003) with one more rule: an overdue walk older than 24 hours takes no
-- new location. Otherwise an app left open would put back the location step 3 just erased.
create or replace function public.update_walk_location(
  walk_id uuid,
  lat double precision,
  lng double precision
)
returns public.walks
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_walk public.walks;
begin
  update public.walks
  set last_lat = lat, last_lng = lng, last_location_at = now()
  where id = walk_id
    and user_id = (select auth.uid())
    and (
      status = 'active'
      or (status = 'overdue' and overdue_at > now() - interval '24 hours')
    )
  returning * into updated_walk;

  if updated_walk.id is null then
    raise exception 'No walk in progress with this id';
  end if;

  return updated_walk;
end;
$$;

-- Same rights as before: only the database runs the first two, only logged-in users the third.
revoke execute on function public.send_walk_push() from public, anon, authenticated;
revoke execute on function public.check_late_walks() from public, anon, authenticated;
revoke execute on function public.update_walk_location(uuid, double precision, double precision)
  from public, anon;
grant execute on function public.update_walk_location(uuid, double precision, double precision)
  to authenticated;
