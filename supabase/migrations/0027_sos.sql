-- SCRUM-78: the SOS function. The walker asks for help, and the walk's contacts are alerted at
-- once, without waiting for the timer.
--
-- An SOS is not a new status. It means "come and find me here, now", which is what an overdue walk
-- already means to the contacts. So send_sos makes the walk 'overdue' straight away and also saves
-- the moment in sos_at. Everything an overdue walk already has then works for an SOS as well:
-- - the contacts may see the last known location (followed_walk, 0013), and the route is erased
--   (0023);
-- - the location is erased 24 hours after overdue_at (0012);
-- - the walker can still check in, and the contacts then hear "is safe" (0004, 0012).
-- sos_at only changes the words: the push says "asked for help" instead of "hasn't checked in",
-- and the contacts' screens can say so too.
--
-- The alert carries no location, like the overdue alert (0012): it opens the walk in the app,
-- where the contact sees the last known location and when it was saved. The app sends a fresh
-- location with the SOS when it has one, so that location is as new as possible.
--
-- Only an active walk can send SOS. This includes the grace period after "Are you OK?", when the
-- walk is still active. Once a walk is overdue the contacts have already been alerted.
-- No call 112 button: the team decided to leave it out.
--
-- Deploy send-walk-push with the sos event before running this file, or the function answers
-- "Expected { walk_id, event }" and the alert is lost (docs/backend.md, "Sending push").

alter table public.walks
  -- When the walker pressed SOS. Empty for every other walk.
  add column sos_at timestamptz,
  -- send_sos sets both in the same moment, so an SOS is always an overdue walk with the same time.
  add constraint walks_sos_is_overdue check (sos_at is null or sos_at = overdue_at);

-- Sends the SOS for the caller's own active walk. lat and lng are the walker's position right now,
-- and may be left out when the phone has none: the last saved location is then used.
create function public.send_sos(
  walk_id uuid,
  lat double precision default null,
  lng double precision default null
)
returns public.walks
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_walk public.walks;
begin
  if (lat is null) <> (lng is null) then
    raise exception 'A location needs both lat and lng';
  end if;

  update public.walks
  set status = 'overdue',
    sos_at = now(),
    overdue_at = now(),
    -- An overdue walk always has a warning before it (0011). An SOS can come before the deadline,
    -- so it counts as the warning when there was none.
    warned_at = coalesce(warned_at, now()),
    last_lat = coalesce(lat, last_lat),
    last_lng = coalesce(lng, last_lng),
    last_location_at = case when lat is null then last_location_at else now() end
  where id = send_sos.walk_id
    and user_id = (select auth.uid())
    and status = 'active'
  returning * into updated_walk;

  if updated_walk.id is null then
    raise exception 'No walk in progress with this id';
  end if;

  return updated_walk;
end;
$$;

revoke execute on function public.send_sos(uuid, double precision, double precision)
  from public, anon;
grant execute on function public.send_sos(uuid, double precision, double precision)
  to authenticated;

-- The trigger function from 0012, with 'sos' for an overdue walk that came from send_sos. The
-- trigger itself is unchanged: it fires once when the status becomes overdue, so an SOS sends one
-- alert, never an SOS and an overdue alert. The names match WalkEvent in
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
      when new.status = 'overdue' and new.sos_at is not null then 'sos'
      when new.status = 'overdue' then 'overdue'
      else 'cancelled'
    end
  );
  return new;
end;
$$;

revoke execute on function public.send_walk_push() from public, anon, authenticated;

-- followed_walk from 0023 with one more column, sos_at, so the contact's walk screen can say
-- "asked for help". A function's columns cannot be changed with "create or replace", so it is
-- dropped and created again. Everything else is unchanged.
drop function public.followed_walk(uuid);

create function public.followed_walk(walk_id uuid)
returns table (
  walker_name text,
  status text,
  deadline timestamptz,
  overdue_at timestamptz,
  sos_at timestamptz,
  checked_in_at timestamptz,
  cancelled_at timestamptz,
  last_lat double precision,
  last_lng double precision,
  last_location_at timestamptz,
  you_are_watching boolean,
  route jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.walk_contacts
    join public.contacts on contacts.id = walk_contacts.contact_id
    where walk_contacts.walk_id = followed_walk.walk_id
      and contacts.contact_user_id = (select auth.uid())
      and contacts.status = 'accepted'
  ) then
    -- Same answer for "no such walk" and "not yours to see", so nobody can find out which walks
    -- exist.
    raise exception 'This walk is not shared with you';
  end if;

  return query
  select
    profiles.display_name,
    walks.status,
    walks.deadline,
    walks.overdue_at,
    walks.sos_at,
    walks.checked_in_at,
    walks.cancelled_at,
    -- The location only while the walk is overdue (unchanged from 0013). An SOS is overdue too.
    case when walks.status = 'overdue' then walks.last_lat end,
    case when walks.status = 'overdue' then walks.last_lng end,
    case when walks.status = 'overdue' then walks.last_location_at end,
    exists (
      select 1
      from public.walk_contacts as mine
      join public.contacts on contacts.id = mine.contact_id
      where mine.walk_id = walks.id
        and contacts.contact_user_id = (select auth.uid())
        and mine.watching_at is not null
    ),
    case when walks.status = 'active' then walks.route end
  from public.walks
  join public.profiles on profiles.id = walks.user_id
  where walks.id = followed_walk.walk_id;
end;
$$;

revoke execute on function public.followed_walk(uuid) from public, anon;
grant execute on function public.followed_walk(uuid) to authenticated;

-- followed_walk_statuses from 0018 with sos_at, so the Contacts tab can say "asked for help"
-- instead of "check-in overdue". Dropped and created again for the same reason as above.
drop function public.followed_walk_statuses();

create function public.followed_walk_statuses()
returns table (
  walk_id uuid,
  walker_name text,
  contact_id uuid,
  status text,
  started_at timestamptz,
  deadline timestamptz,
  overdue_at timestamptz,
  sos_at timestamptz,
  checked_in_at timestamptz,
  cancelled_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (walks.user_id)
    walks.id,
    profiles.display_name,
    own_contact.id,
    walks.status,
    walks.started_at,
    walks.deadline,
    walks.overdue_at,
    walks.sos_at,
    walks.checked_in_at,
    walks.cancelled_at
  from public.walks
  join public.walk_contacts on walk_contacts.walk_id = walks.id
  join public.contacts as followed on followed.id = walk_contacts.contact_id
  join public.profiles on profiles.id = walks.user_id
  left join public.contacts as own_contact
    on own_contact.user_id = (select auth.uid())
    and own_contact.contact_user_id = walks.user_id
  where followed.contact_user_id = (select auth.uid())
    and followed.status = 'accepted'
    and (
      walks.status in ('active', 'overdue')
      -- Assumption from 0016: an ended walk is still worth showing for 12 hours.
      or coalesce(walks.checked_in_at, walks.cancelled_at) > now() - interval '12 hours'
    )
  -- One walk per walker: an overdue walk (an SOS included) first, then the newest.
  order by walks.user_id, (walks.status = 'overdue') desc, walks.started_at desc;
$$;

revoke execute on function public.followed_walk_statuses() from public, anon;
grant execute on function public.followed_walk_statuses() to authenticated;
