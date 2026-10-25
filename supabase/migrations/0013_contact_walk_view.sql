-- SCRUM-102: a contact can see the walk they were alerted about.
--
-- Tapping the alert from SCRUM-74 opens the app with ?walk=<id>. The contact then needs: whose
-- walk it is, whether the check-in is overdue, when it was due, and the last known location with
-- the time it was saved.
--
-- This is the first time someone other than the owner can read walk data, so it is kept as narrow
-- as possible:
-- - Only a contact who was added to this walk (walk_contacts) and who accepted and is not paused.
-- - The location only while the walk is overdue. Before that the contact has no reason to know
--   where the user is; after the check-in (which erases it, 0004) or 24 hours after overdue (0012)
--   it is gone anyway.
-- - Not the destination, not the start time, not the route. Decided on 25 Oct: a typed destination
--   can be a home address, and the last location already tells the contact where to look.
--
-- Jira asks for "an RLS rule". A row policy would open the whole walk row (destination, location
-- while still on the way). This function returns only the fields above, the same way the app reads
-- other people's data elsewhere (get_invite in 0005).

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
  last_location_at timestamptz
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
    -- The location only while the walk is overdue.
    case when walks.status = 'overdue' then walks.last_lat end,
    case when walks.status = 'overdue' then walks.last_lng end,
    case when walks.status = 'overdue' then walks.last_location_at end
  from public.walks
  join public.profiles on profiles.id = walks.user_id
  where walks.id = followed_walk.walk_id;
end;
$$;

-- Only logged-in users may call it; the check above decides what they see.
revoke execute on function public.followed_walk(uuid) from public, anon;
grant execute on function public.followed_walk(uuid) to authenticated;
