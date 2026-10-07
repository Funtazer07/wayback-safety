-- SCRUM-48: the check-in ("I'm home") on the server.
--
-- Checking in ends a walk: the status becomes 'safe', which stops the timer, because only an
-- 'active' walk can become late. The moment of the check-in is saved, so SCRUM-7 (Sprint 2) can
-- tell the contacts about it.
--
-- Data minimisation: once the user is home, the last known location has no purpose any more, so
-- the check-in erases it. After that the walk refuses new locations (see update_walk_location in
-- 0003_walks.sql, which only accepts 'active' and 'overdue' walks).

-- Empty until the user checks in.
alter table public.walks add column checked_in_at timestamptz;

-- Nothing in the app could set 'safe' before this file, so this only touches test rows that were
-- changed by hand in the Table Editor. Without it the check below would refuse those rows.
update public.walks set checked_in_at = started_at where status = 'safe';

alter table public.walks
  -- A walk is 'safe' exactly when it has a check-in time. Never one without the other.
  add constraint walks_checked_in_when_safe check ((checked_in_at is not null) = (status = 'safe')),
  -- A check-in cannot come before the walk started.
  add constraint walks_checked_in_after_start check (checked_in_at >= started_at);

-- Ends a walk of the logged-in user as "home safe" and returns it. The time comes from the
-- server's clock, like the deadline does.
create function public.check_in(walk_id uuid)
returns public.walks
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_walk public.walks;
begin
  update public.walks
  set status = 'safe',
      checked_in_at = now(),
      -- Assumption: the last known location is erased the moment the user is home. Keep it
      -- instead if the alert story (SCRUM-7) turns out to need it after a late check-in.
      last_lat = null,
      last_lng = null,
      last_location_at = null
  where id = walk_id
    and user_id = (select auth.uid())
    -- Assumption: an overdue walk can still be checked in, so a user who is late can tell their
    -- contacts they are home after all. Nothing sets 'overdue' yet; the alert story does.
    and status in ('active', 'overdue')
  returning * into updated_walk;

  -- Also the answer to a second check-in on the same walk: it is already 'safe'.
  if updated_walk.id is null then
    raise exception 'No walk in progress with this id';
  end if;

  return updated_walk;
end;
$$;

-- Only logged-in users may call the function.
revoke execute on function public.check_in(uuid) from public, anon;
grant execute on function public.check_in(uuid) to authenticated;
