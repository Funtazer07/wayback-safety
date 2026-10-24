-- SCRUM-63: extend and cancel a walk on the server.
--
-- Extending moves the deadline, so someone who is slower than planned does not cause a false alarm
-- (SCRUM-12). The client's rule: the app must never move the deadline by itself. This function
-- only runs when the user taps a button; nothing on the server calls it.
--
-- Cancelling ends a walk without a check-in, for example when the user gets a lift. A cancelled walk
-- can never become late, and its last known location is erased, like at a check-in.
--
-- Telling the contacts that a walk was cancelled comes with the sending function (SCRUM-69). The
-- time of the cancel is saved here so that code can read it.

-- Empty unless the walk was cancelled.
alter table public.walks add column cancelled_at timestamptz;

-- A fourth status: cancelled. The old check (from 0003_walks.sql) only allowed three.
alter table public.walks drop constraint walks_status_check;

alter table public.walks
  add constraint walks_status_check
    check (status in ('active', 'safe', 'overdue', 'cancelled')),
  -- A walk is 'cancelled' exactly when it has a cancel time. Never one without the other.
  add constraint walks_cancelled_when_cancelled
    check ((cancelled_at is not null) = (status = 'cancelled')),
  -- A cancel cannot come before the walk started.
  add constraint walks_cancelled_after_start check (cancelled_at >= started_at);

-- Moves the deadline of the logged-in user's walk later by the given minutes and returns the walk.
--
-- The minutes are added to the deadline, or to now if the deadline has already passed. Someone who
-- taps "+5 minutes" during the "Are you OK?" grace period (SCRUM-101) gets 5 minutes from that
-- moment, not a deadline that is still in the past.
create function public.extend_walk(walk_id uuid, minutes integer)
returns public.walks
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_walk public.walks;
begin
  -- Assumption: one tap adds at most 60 minutes. The buttons offer 5, 10 and 15 (SCRUM-62).
  if minutes is null or minutes not between 1 and 60 then
    raise exception 'You can add between 1 and 60 minutes at a time';
  end if;

  update public.walks
  set deadline = greatest(deadline, now()) + make_interval(mins => minutes)
  where id = walk_id
    and user_id = (select auth.uid())
    -- Assumption: an overdue walk cannot be extended. Its contacts were already alerted, and
    -- quietly moving the deadline would leave them worried. The user checks in instead, and the
    -- contacts are told they are safe (SCRUM-74).
    and status = 'active'
    -- Assumption: the deadline is never more than 3 hours away, the same limit as when a walk
    -- starts (0003_walks.sql). Stops a walk from being stretched without end, tap after tap.
    and greatest(deadline, now()) + make_interval(mins => minutes) <= now() + interval '180 minutes'
  returning * into updated_walk;

  if updated_walk.id is null then
    -- Find out which rule refused it, so the user gets a useful message.
    if exists (
      select 1 from public.walks
      where id = walk_id and user_id = (select auth.uid()) and status = 'active'
    ) then
      raise exception 'The deadline cannot be more than 3 hours from now';
    end if;
    raise exception 'No walk in progress with this id';
  end if;

  return updated_walk;
end;
$$;

-- Ends the logged-in user's walk as cancelled and returns it. The time comes from the server's
-- clock, like the deadline does.
create function public.cancel_walk(walk_id uuid)
returns public.walks
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_walk public.walks;
begin
  update public.walks
  set status = 'cancelled',
      cancelled_at = now(),
      -- A cancelled walk needs no location any more. update_walk_location (0003_walks.sql) only
      -- accepts active and overdue walks, so no new location can come in afterwards either.
      last_lat = null,
      last_lng = null,
      last_location_at = null
  where id = walk_id
    and user_id = (select auth.uid())
    -- Assumption: only an active walk can be cancelled. After the alert went out (overdue) the user
    -- checks in instead, so the contacts hear they are safe and not just that the walk stopped.
    and status = 'active'
  returning * into updated_walk;

  -- Also the answer to a second cancel on the same walk: it is already cancelled.
  if updated_walk.id is null then
    raise exception 'No walk in progress with this id';
  end if;

  return updated_walk;
end;
$$;

-- Only logged-in users may call the functions.
revoke execute on function public.extend_walk(uuid, integer) from public, anon;
revoke execute on function public.cancel_walk(uuid) from public, anon;
grant execute on function public.extend_walk(uuid, integer) to authenticated;
grant execute on function public.cancel_walk(uuid) to authenticated;
