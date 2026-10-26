-- SCRUM-104: the Contacts tab shows when someone the user looks out for has missed a check-in.
--
-- Until now a contact could only reach an overdue walk by tapping the alert (SCRUM-74). Someone
-- who swiped the alert away and opened WayBack later saw nothing. This function lists the overdue
-- walks the user follows, so the Contacts tab can say "Check-in overdue · View walk" next to that
-- person. Tapping it opens followed_walk (0013), which shows the details.
--
-- The same rule as followed_walk: only a contact who was added to the walk and who accepted and is
-- not paused, and only while the walk is overdue. It returns no location, no destination and no
-- times other than when the walk became overdue: the walk view itself decides what the contact may
-- see.
--
-- An overdue walk stays overdue until the walker checks in, so an old walk keeps showing. That is
-- on purpose: nobody has heard from the walker since.

create function public.overdue_followed_walks()
returns table (
  walk_id uuid,
  walker_name text,
  -- The user's own contacts row for the walker, so the app can put the line next to that person.
  -- Empty when the user removed the walker from their own list: the walker still has the user as a
  -- contact, so the app shows the walk on its own line.
  contact_id uuid,
  overdue_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (walks.id)
    walks.id,
    profiles.display_name,
    own_contact.id,
    walks.overdue_at
  from public.walks
  join public.walk_contacts on walk_contacts.walk_id = walks.id
  join public.contacts as followed on followed.id = walk_contacts.contact_id
  join public.profiles on profiles.id = walks.user_id
  -- The user's own link back to the walker (two-way since 0014), if it is still there.
  left join public.contacts as own_contact
    on own_contact.user_id = (select auth.uid())
    and own_contact.contact_user_id = walks.user_id
  where walks.status = 'overdue'
    and followed.contact_user_id = (select auth.uid())
    and followed.status = 'accepted'
  order by walks.id;
$$;

-- Only logged-in users may call it; the filter above limits it to the walks they follow.
revoke execute on function public.overdue_followed_walks() from public, anon;
grant execute on function public.overdue_followed_walks() to authenticated;
