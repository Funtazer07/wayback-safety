-- The Activity feed on the Contacts tab (screen 09 of the prototype) says when someone started a
-- walk: "Anna started a walk · 22:06". followed_walk_statuses (0016) did not return the start time,
-- so it is replaced here with one more column, started_at. Everything else is the same as in 0016.
--
-- What a contact learns: only the moment the walk started, which the "is on the way home" push
-- message (0009) already tells them. Still no destination and no location.
--
-- A function's columns cannot be changed with "create or replace", so it is dropped and created
-- again, with the same rights.

drop function public.followed_walk_statuses();

create function public.followed_walk_statuses()
returns table (
  walk_id uuid,
  walker_name text,
  -- The user's own contacts row for the walker. Empty when the user removed the walker from their
  -- own list (see 0015).
  contact_id uuid,
  status text,
  started_at timestamptz,
  deadline timestamptz,
  overdue_at timestamptz,
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
      -- Walks that are still going on, and every overdue walk: nobody has heard from the walker.
      walks.status in ('active', 'overdue')
      -- Assumption from 0016: an ended walk is still worth showing for 12 hours.
      or coalesce(walks.checked_in_at, walks.cancelled_at) > now() - interval '12 hours'
    )
  -- One walk per walker: an overdue walk first, because it needs attention, then the newest.
  order by walks.user_id, (walks.status = 'overdue') desc, walks.started_at desc;
$$;

-- Only logged-in users may call it; the filter above limits it to the caller's own contacts.
revoke execute on function public.followed_walk_statuses() from public, anon;
grant execute on function public.followed_walk_statuses() to authenticated;
