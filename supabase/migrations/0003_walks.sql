-- SCRUM-43: the walks table and the server-side timer.
--
-- One row per walk home. The deadline is worked out and stored here, on the server, so the timer
-- keeps running when the phone is locked or the app is closed (SCRUM-11). The app only shows a
-- countdown to this deadline; it never decides the deadline itself.
--
-- Data minimisation: a walk holds ONE last known location, overwritten on every update. There is
-- no trail of where the user has been.

create table public.walks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- What the user picked as destination, for example "Home" or "Stratumseind 32".
  destination_label text not null check (char_length(btrim(destination_label)) between 1 and 120),
  -- Where that is on the map. Empty for now: the app cannot look up an address yet, so the user
  -- only picks or types a name. Both are filled in or both are empty.
  destination_lat double precision check (destination_lat between -90 and 90),
  destination_lng double precision check (destination_lng between -180 and 180),
  started_at timestamptz not null default now(),
  -- When the user should be home.
  deadline timestamptz not null,
  -- active:  the user is on the way. Late when the deadline has passed and it is still active.
  -- safe:    the user checked in.
  -- overdue: the deadline passed without a check-in and the alert went out.
  -- This migration only ever writes 'active'. The check-in and alert stories set the other two.
  status text not null default 'active' check (status in ('active', 'safe', 'overdue')),
  -- Empty until the app sends the first location.
  last_lat double precision check (last_lat between -90 and 90),
  last_lng double precision check (last_lng between -180 and 180),
  last_location_at timestamptz,
  check (deadline > started_at),
  check ((destination_lat is null) = (destination_lng is null)),
  check ((last_lat is null) = (last_lng is null) and (last_lat is null) = (last_location_at is null))
);

-- A user can only be on one walk at a time. Also makes "find my active walk" fast.
create unique index walks_one_active_per_user on public.walks (user_id) where status = 'active';

-- Row level security, same pattern as 0001_profiles.sql.
alter table public.walks enable row level security;

create policy "Users can read their own walks"
  on public.walks for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert, update or delete policy on purpose. The app cannot write to this table directly; it
-- calls the two functions below. That way the deadline always comes from the server's clock, and
-- a user cannot move a deadline or change a status by hand.

-- Starts a walk for the logged-in user and returns it. The deadline is now + minutes. lat and lng
-- say where the destination is and may be left out.
create function public.start_walk(
  label text,
  minutes integer,
  lat double precision default null,
  lng double precision default null
)
returns public.walks
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_walk public.walks;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  -- Assumption: no walk home in Eindhoven takes longer than 3 hours. Change it here if the
  -- timer screen (SCRUM-44) allows more.
  if minutes is null or minutes not between 1 and 180 then
    raise exception 'The walk must take between 1 and 180 minutes';
  end if;

  insert into public.walks (user_id, destination_label, destination_lat, destination_lng, deadline)
  values ((select auth.uid()), btrim(label), lat, lng, now() + make_interval(mins => minutes))
  returning * into new_walk;

  return new_walk;
exception
  when unique_violation then
    raise exception 'You already have an active walk';
end;
$$;

-- Stores where the user is now, replacing the previous location, and returns the walk so the app
-- sees the current deadline and status. Still allowed on an overdue walk: that is when the last
-- known location matters most.
create function public.update_walk_location(
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
    and status in ('active', 'overdue')
  returning * into updated_walk;

  if updated_walk.id is null then
    raise exception 'No walk in progress with this id';
  end if;

  return updated_walk;
end;
$$;

-- Only logged-in users may call the functions.
revoke execute on function public.start_walk(text, integer, double precision, double precision)
  from public, anon;
revoke execute on function public.update_walk_location(uuid, double precision, double precision)
  from public, anon;
grant execute on function public.start_walk(text, integer, double precision, double precision)
  to authenticated;
grant execute on function public.update_walk_location(uuid, double precision, double precision)
  to authenticated;
