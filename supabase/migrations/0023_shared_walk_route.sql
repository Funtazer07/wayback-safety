-- The walker's planned route for the contacts, while the walk is on the way.
--
-- Before this file a contact opening "Anna is on the way home" saw only the due time, and the route
-- stayed on the walker's phone (src/features/map/walkRoute.ts). Decided on 27 Oct: the contact sees
-- the route the walker planned, so they know which way Anna is coming. It is the plan, not where
-- Anna is: no live position is added, and the last known location is still shared only after a
-- missed check-in (0012, 0013).
--
-- Also decided on 27 Oct: the whole route is shared, including its end. That end is usually the
-- walker's home, so this reverses the 25 Oct rule "never the route" for walks on the way. The
-- reason: contacts are people the walker chose and who accepted, and they mostly know the address
-- already. The destination's typed name is still never shared.
--
-- How long it is kept: only while the walk is on the way. As soon as the walk is checked in,
-- cancelled or becomes overdue the route is erased, by a trigger, so no code path can forget it.
-- A walk without a planned route simply has none.

alter table public.walks
  -- The planned route as a list of [longitude, latitude] points, from the app's route planner.
  -- Empty for a walk started without a route, and erased when the walk is no longer on the way.
  add column route jsonb,
  -- Assumption: 2000 points is far more than a walk home in Eindhoven needs (a 3 km route from the
  -- planner has a few hundred). The limit keeps one row from growing without end.
  add constraint walks_route_is_a_line check (
    route is null
    or case
      when jsonb_typeof(route) = 'array' then jsonb_array_length(route) between 2 and 2000
      else false
    end
  ),
  -- Only a walk on the way has a route. The trigger below makes sure of it.
  add constraint walks_route_only_while_active check (route is null or status = 'active');

-- The walker shares the route of their own walk, right after starting it. Replaces the route if
-- it is called again. Only for an active walk: an ended walk must not get a route back.
create function public.share_walk_route(walk_id uuid, route jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if jsonb_typeof(route) is distinct from 'array'
    or jsonb_array_length(route) not between 2 and 2000 then
    raise exception 'A route is a list of 2 to 2000 points';
  end if;

  -- Every point must be [longitude, latitude] with numbers on the earth. The "case" checks the
  -- shape first, so a wrong point gives this message instead of a type error.
  if exists (
    select 1
    from jsonb_array_elements(share_walk_route.route) as point
    where case
      when jsonb_typeof(point) = 'array'
        and jsonb_array_length(point) = 2
        and jsonb_typeof(point -> 0) = 'number'
        and jsonb_typeof(point -> 1) = 'number'
      then (point ->> 0)::double precision not between -180 and 180
        or (point ->> 1)::double precision not between -90 and 90
      else true
    end
  ) then
    raise exception 'Each point of a route is [longitude, latitude]';
  end if;

  update public.walks
  set route = share_walk_route.route
  where id = share_walk_route.walk_id
    and user_id = (select auth.uid())
    and status = 'active';

  if not found then
    raise exception 'No walk in progress with this id';
  end if;
end;
$$;

revoke execute on function public.share_walk_route(uuid, jsonb) from public, anon;
grant execute on function public.share_walk_route(uuid, jsonb) to authenticated;

-- Erases the route the moment a walk stops being on the way: checked in, cancelled or overdue.
-- "before update" changes the row as it is saved, so the route is never stored next to an ended
-- status, not even for a moment.
create function public.erase_walk_route()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.route := null;
  return new;
end;
$$;

revoke execute on function public.erase_walk_route() from public, anon, authenticated;

create trigger walks_erase_route_when_ended
  before update of status on public.walks
  for each row
  when (new.status <> 'active')
  execute function public.erase_walk_route();

-- followed_walk from 0019, with one more column: the route, only while the walk is on the way. A
-- function's columns cannot be changed with "create or replace", so it is dropped and created
-- again. Everything else is unchanged.
drop function public.followed_walk(uuid);

create function public.followed_walk(walk_id uuid)
returns table (
  walker_name text,
  status text,
  deadline timestamptz,
  overdue_at timestamptz,
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
    walks.checked_in_at,
    walks.cancelled_at,
    -- The location only while the walk is overdue (unchanged from 0013).
    case when walks.status = 'overdue' then walks.last_lat end,
    case when walks.status = 'overdue' then walks.last_lng end,
    case when walks.status = 'overdue' then walks.last_location_at end,
    -- Whether this contact tapped "I'm watching" on this walk.
    exists (
      select 1
      from public.walk_contacts as mine
      join public.contacts on contacts.id = mine.contact_id
      where mine.walk_id = walks.id
        and contacts.contact_user_id = (select auth.uid())
        and mine.watching_at is not null
    ),
    -- The planned route only while the walk is on the way. The trigger above erases it afterwards
    -- anyway; this keeps the rule visible here too.
    case when walks.status = 'active' then walks.route end
  from public.walks
  join public.profiles on profiles.id = walks.user_id
  where walks.id = followed_walk.walk_id;
end;
$$;

revoke execute on function public.followed_walk(uuid) from public, anon;
grant execute on function public.followed_walk(uuid) to authenticated;
