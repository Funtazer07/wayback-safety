-- SCRUM-114: a contact can say "I'm watching", and the walker sees it.
--
-- Client feedback (Studio Krom, SCRUM-27 comment, 13 Oct): choosing contacts without any sign from
-- their side may not be enough for the walker to feel someone is really looking out for them. The
-- simple version from Jira: the contact opens the walk ("Anna is on the way home") and taps "I'm
-- watching"; the walker sees "Mum is watching your walk" on the walk screen.
--
-- What is stored: only the moment the contact tapped, on their link to that walk (walk_contacts).
-- It goes when the walk goes. The contact learns nothing new: no location, no destination.
-- The walker learns that this contact tapped, which is the point of the button.

alter table public.walk_contacts
  -- When this contact tapped "I'm watching". Empty until then. Set only by watch_walk below.
  add column watching_at timestamptz;

-- The contact taps "I'm watching". Only for a walk they were added to, as a contact who accepted
-- and is not paused, and only while the walk is on the way: once it is overdue the alert has gone
-- out, and once it ended there is nothing to watch. Tapping twice keeps the first time.
create function public.watch_walk(walk_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.walk_contacts
  set watching_at = coalesce(walk_contacts.watching_at, now())
  from public.contacts, public.walks
  where walk_contacts.walk_id = watch_walk.walk_id
    and contacts.id = walk_contacts.contact_id
    and contacts.contact_user_id = (select auth.uid())
    and contacts.status = 'accepted'
    and walks.id = walk_contacts.walk_id
    and walks.status = 'active';

  if not found then
    -- The same answer for "not yours" and "no such walk", as in followed_walk (0013). A walk that
    -- just ended gets it too; the app shows the walk's new state anyway.
    raise exception 'This walk is not shared with you, or it is no longer on the way';
  end if;
end;
$$;

-- followed_walk from 0013, with one more column: whether this contact already tapped "I'm
-- watching", so the button does not come back after reopening the app. A function's columns
-- cannot be changed with "create or replace", so it is dropped and created again.
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
  you_are_watching boolean
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
    )
  from public.walks
  join public.profiles on profiles.id = walks.user_id
  where walks.id = followed_walk.walk_id;
end;
$$;

-- Only logged-in users may call them; the checks above decide what they may do or see.
revoke execute on function public.watch_walk(uuid) from public, anon;
grant execute on function public.watch_walk(uuid) to authenticated;
revoke execute on function public.followed_walk(uuid) from public, anon;
grant execute on function public.followed_walk(uuid) to authenticated;
