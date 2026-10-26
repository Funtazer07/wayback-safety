-- SCRUM-60: accepting an invite makes the two people each other's trusted contact.
--
-- Decided on 26 Oct, after testing on two phones, different from SCRUM-27 and SCRUM-59 in Jira
-- (which describe one way: "choose who looks out for me"): when Sam accepts Anna's invite, Sam
-- looks out for Anna AND Anna looks out for Sam. People expected that, and it saves a second
-- invite. Either side can still pause or remove the other at any time; removing one direction
-- leaves the other as it is.
--
-- What this means for privacy: by accepting, Sam also shares his own walks with Anna (who started,
-- arrived, and after a missed check-in his last known location). The accept screen says so before
-- the tap.
--
-- accept_invite (0005) is replaced. It still links Sam as Anna's contact, and now also adds Anna as
-- Sam's contact, under the name Anna chose for herself in onboarding. If Sam already had Anna as a
-- contact (accepted or paused), that link is left exactly as it was.

create or replace function public.accept_invite(token text)
returns public.contacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_contact public.contacts;
  inviter uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  select user_id into inviter
  from public.contacts
  where invite_token_hash = pg_catalog.sha256(convert_to(token, 'UTF8'))
    and invite_expires_at > now();

  if inviter is null then
    raise exception 'This invite link is not valid any more';
  end if;

  if inviter = (select auth.uid()) then
    raise exception 'You cannot accept your own invite';
  end if;

  update public.contacts
  set contact_user_id = (select auth.uid()),
      status = 'accepted',
      accepted_at = now(),
      -- The link has done its job. Erasing the fingerprint makes it unusable for anyone else.
      invite_token_hash = null,
      invite_expires_at = null
  where invite_token_hash = pg_catalog.sha256(convert_to(token, 'UTF8'))
  returning * into accepted_contact;

  -- Someone else accepted the same link a moment earlier.
  if accepted_contact.id is null then
    raise exception 'This invite link is not valid any more';
  end if;

  -- The other direction: the inviter becomes the accepter's contact too. "do nothing" keeps a link
  -- that already exists (contacts_one_link_per_pair in 0005), including a paused one.
  insert into public.contacts (user_id, contact_user_id, label, status, accepted_at)
  select
    (select auth.uid()),
    inviter,
    -- The name the inviter chose in onboarding. Assumption: "Contact" for an old account without
    -- one; the label cannot be empty.
    coalesce(nullif(btrim(profiles.display_name), ''), 'Contact'),
    'accepted',
    now()
  from public.profiles
  where profiles.id = inviter
  on conflict (user_id, contact_user_id) where contact_user_id is not null do nothing;

  return accepted_contact;
exception
  when unique_violation then
    raise exception 'You already look out for this person';
end;
$$;

-- Same rights as before.
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- Links accepted before this file go one way only. Only test accounts exist so far (the app is not
-- launched), so they are made two-way too, the same way, to match what testers now expect.
insert into public.contacts (user_id, contact_user_id, label, status, accepted_at)
select
  one_way.contact_user_id,
  one_way.user_id,
  coalesce(nullif(btrim(profiles.display_name), ''), 'Contact'),
  'accepted',
  now()
from public.contacts as one_way
join public.profiles on profiles.id = one_way.user_id
where one_way.status in ('accepted', 'paused')
on conflict (user_id, contact_user_id) where contact_user_id is not null do nothing;
