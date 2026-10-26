-- SCRUM-103 and SCRUM-115: what the Contacts tab says about each person.
--
-- Testing on two phones (26 Oct) showed that "Invitation accepted" tells the user nothing. Two
-- functions give the tab something useful to say, each with as little data as possible:
--
-- 1. contact_alert_status (SCRUM-103): can this contact receive an alert at all? Alerts go out by
--    Web Push only (SCRUM-66), so a contact who never allowed notifications gets nothing, while
--    the walker thinks they are covered. Only yes or no per contact: never device details or push
--    addresses.
--
-- 2. followed_walk_statuses (SCRUM-115): the latest walk of each person the user looks out for, so
--    the tab can say "On the way · home by 22:36", "Check-in overdue" or "Home safe at 22:31",
--    and keep that up to date. The same rule as followed_walk (0013): only walks the user was
--    added to, as a contact who accepted and is not paused. No location, no destination: the
--    walk view itself (0013) decides what a contact may see when they open it.
--
-- followed_walk_statuses also returns overdue walks, so it replaces overdue_followed_walks (0015).
-- That function is dropped here; the app stops using it in the same change.

create function public.contact_alert_status()
returns table (contact_id uuid, can_receive_alerts boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    contacts.id,
    exists (
      select 1 from public.push_subscriptions
      where push_subscriptions.user_id = contacts.contact_user_id
    )
  from public.contacts
  -- Only the caller's own contacts who accepted: an open invite has nobody to ask about yet.
  where contacts.user_id = (select auth.uid())
    and contacts.status in ('accepted', 'paused');
$$;

create function public.followed_walk_statuses()
returns table (
  walk_id uuid,
  walker_name text,
  -- The user's own contacts row for the walker, so the app can put the status next to that
  -- person. Empty when the user removed the walker from their own list (see 0015).
  contact_id uuid,
  status text,
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
      -- Assumption: an ended walk is still worth showing for 12 hours ("Home safe at 22:31"
      -- the morning after), and old news after that. Confirm in SCRUM-115.
      or coalesce(walks.checked_in_at, walks.cancelled_at) > now() - interval '12 hours'
    )
  -- One walk per walker: an overdue walk first, because it needs attention, then the newest.
  order by walks.user_id, (walks.status = 'overdue') desc, walks.started_at desc;
$$;

drop function public.overdue_followed_walks();

-- Only logged-in users may call them; the filters above limit them to the caller's own contacts.
revoke execute on function public.contact_alert_status() from public, anon;
grant execute on function public.contact_alert_status() to authenticated;
revoke execute on function public.followed_walk_statuses() from public, anon;
grant execute on function public.followed_walk_statuses() to authenticated;
