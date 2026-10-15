-- SCRUM-59: trusted contacts, invite links, and which contacts follow a walk.
--
-- A user invites someone they trust with a link. The link opens the app; the contact signs in and
-- accepts. Only then are the two accounts linked. Decided on 15 Oct: a contact needs their own
-- account, because alerts go out by Web Push only (SCRUM-66) and a push subscription belongs to
-- an account. "Invite by email" (SCRUM-27) means the user sends the link from their own mail app;
-- we send no email ourselves.
--
-- Also here, by the same decision: the walk_contacts table, which says which contacts follow a
-- walk. SCRUM-74 alerts exactly these contacts.
--
-- Data minimisation: about the contact we store only the name the user gives them (for example
-- "Mum") and, after they accept, a link to their profile. No phone number, no email address.
-- The invite link itself is not stored, only a fingerprint (hash) of it, and the fingerprint is
-- erased once the invite is accepted.

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  -- The user who is looked out for: the one who sent the invite.
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The user who looks out. Empty while the invite is open: nobody has accepted it yet.
  contact_user_id uuid references public.profiles (id) on delete cascade,
  -- What the user calls this contact, for example "Mum" or "Alex". Only the two of them see it.
  label text not null check (char_length(btrim(label)) between 1 and 40),
  -- invited:  the link is sent, nobody accepted it yet. The contact gets nothing.
  -- accepted: the contact accepted and can follow walks.
  -- paused:   the user paused this contact. It stays in the list but cannot follow new walks.
  status text not null default 'invited' check (status in ('invited', 'accepted', 'paused')),
  created_at timestamptz not null default now(),
  -- Fingerprint (SHA-256) of the secret in the invite link. Someone who can read this table still
  -- cannot rebuild a working link from it.
  invite_token_hash bytea unique,
  invite_expires_at timestamptz,
  accepted_at timestamptz,
  -- Nobody can be their own contact.
  check (contact_user_id <> user_id),
  -- An open invite has no contact yet and has a link; an accepted or paused one is the other way
  -- round. Never a mix.
  check ((status = 'invited') = (contact_user_id is null)),
  check ((status = 'invited') = (invite_token_hash is not null)),
  check ((status = 'invited') = (accepted_at is null)),
  check ((invite_token_hash is null) = (invite_expires_at is null))
);

-- The same person can accept only one invite from the same user.
create unique index contacts_one_link_per_pair on public.contacts (user_id, contact_user_id)
  where contact_user_id is not null;

-- Which contacts follow a walk. Chosen when the walk starts (see start_walk below).
create table public.walk_contacts (
  walk_id uuid not null references public.walks (id) on delete cascade,
  -- Removing a contact also removes them from the walks they followed.
  contact_id uuid not null references public.contacts (id) on delete cascade,
  primary key (walk_id, contact_id)
);

-- Row level security, same pattern as 0001_profiles.sql.
alter table public.contacts enable row level security;
alter table public.walk_contacts enable row level security;

-- The user sees their contacts and open invites. The contact sees the links where they are the one
-- looking out, and only after accepting: before that their id is not in the row.
create policy "Users can read their own contacts and the users they look out for"
  on public.contacts for select
  to authenticated
  using ((select auth.uid()) in (user_id, contact_user_id));

-- Either side can end the link at any time: the user removes a contact or cancels an invite, or
-- the contact stops looking out. Nothing else can be changed directly.
create policy "Both sides can remove a contact"
  on public.contacts for delete
  to authenticated
  using ((select auth.uid()) in (user_id, contact_user_id));

create policy "Users can read who follows their own walks"
  on public.walk_contacts for select
  to authenticated
  using (
    exists (
      select 1 from public.walks
      where walks.id = walk_contacts.walk_id and walks.user_id = (select auth.uid())
    )
  );

-- No insert or update policies on purpose. The app calls the functions below, so a status can only
-- change in the allowed order and nobody can attach themselves to someone else's account.

-- Creates an invite for the logged-in user and returns the secret for the link. This is the only
-- moment the secret exists in readable form: the database keeps only its fingerprint.
create function public.create_invite(label text)
returns table (contact_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_token text := gen_random_uuid()::text;
  new_contact public.contacts;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  -- Expired invites can never be accepted, so there is no reason to keep them.
  delete from public.contacts
  where user_id = (select auth.uid()) and status = 'invited' and invite_expires_at <= now();

  -- Assumption: 10 contacts and open invites together are plenty. The client asked about three
  -- people (SCRUM-27 comment, 13 Oct). The limit also stops someone from making endless links.
  if (select count(*) from public.contacts where user_id = (select auth.uid())) >= 10 then
    raise exception 'You can have at most 10 contacts and open invites';
  end if;

  insert into public.contacts (user_id, label, invite_token_hash, invite_expires_at)
  values (
    (select auth.uid()),
    -- create_invite.label is the input; plain "label" could also mean the column.
    btrim(create_invite.label),
    pg_catalog.sha256(convert_to(new_token, 'UTF8')),
    -- Assumption: 48 hours is long enough to accept, and short enough that a forwarded or
    -- forgotten link stops working soon (decided on 15 Oct).
    now() + interval '48 hours'
  )
  returning * into new_contact;

  return query select new_contact.id, new_token, new_contact.invite_expires_at;
end;
$$;

-- Tells the person who opened an invite link who sent it, before they accept. Fails when the link
-- is unknown, already used or expired.
create function public.get_invite(token text)
returns table (inviter_name text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select profiles.display_name, contacts.invite_expires_at
  from public.contacts
  join public.profiles on profiles.id = contacts.user_id
  where contacts.invite_token_hash = pg_catalog.sha256(convert_to(token, 'UTF8'))
    and contacts.invite_expires_at > now();

  if not found then
    raise exception 'This invite link is not valid any more';
  end if;
end;
$$;

-- The logged-in user accepts an invite and becomes a contact. The link stops working afterwards.
create function public.accept_invite(token text)
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

  return accepted_contact;
exception
  when unique_violation then
    raise exception 'You already look out for this person';
end;
$$;

-- The person who opened an invite link says no. The invite is deleted, so the user sees it is gone.
create function public.decline_invite(token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.contacts
  where invite_token_hash = pg_catalog.sha256(convert_to(token, 'UTF8'))
    and user_id <> (select auth.uid());

  if not found then
    raise exception 'This invite link is not valid any more';
  end if;
end;
$$;

-- The user pauses a contact (paused = true) or lets them follow walks again (paused = false).
-- Only works on a contact that has accepted.
create function public.set_contact_paused(contact_id uuid, paused boolean)
returns public.contacts
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_contact public.contacts;
begin
  update public.contacts
  set status = case when paused then 'paused' else 'accepted' end
  where id = contact_id
    and user_id = (select auth.uid())
    and status in ('accepted', 'paused')
  returning * into updated_contact;

  if updated_contact.id is null then
    raise exception 'No accepted contact with this id';
  end if;

  return updated_contact;
end;
$$;

-- start_walk (0003_walks.sql) gets one more input: the contacts who follow this walk. It is
-- replaced instead of changed, because Postgres sees a different list of inputs as a different
-- function. Without contact_ids it works exactly as before, so the app keeps working until the
-- contacts screens (SCRUM-60) send them.
drop function public.start_walk(text, integer, double precision, double precision);

create function public.start_walk(
  label text,
  minutes integer,
  lat double precision default null,
  lng double precision default null,
  contact_ids uuid[] default '{}'
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

  -- Only the user's own contacts who accepted and are not paused can follow a walk.
  if exists (
    select 1 from unnest(coalesce(contact_ids, '{}')) as picked (id)
    where not exists (
      select 1 from public.contacts
      where contacts.id = picked.id
        and contacts.user_id = (select auth.uid())
        and contacts.status = 'accepted'
    )
  ) then
    raise exception 'Only your own accepted contacts can follow a walk';
  end if;

  insert into public.walks (user_id, destination_label, destination_lat, destination_lng, deadline)
  values ((select auth.uid()), btrim(label), lat, lng, now() + make_interval(mins => minutes))
  returning * into new_walk;

  -- Assumption: a walk with no contacts is allowed. Users have no contacts until SCRUM-60 is
  -- built, and the timer still helps on its own. The contacts screens can warn about it.
  insert into public.walk_contacts (walk_id, contact_id)
  select distinct new_walk.id, picked.id from unnest(coalesce(contact_ids, '{}')) as picked (id);

  return new_walk;
exception
  when unique_violation then
    raise exception 'You already have an active walk';
end;
$$;

-- Only logged-in users may call the functions.
revoke execute on function public.create_invite(text) from public, anon;
revoke execute on function public.get_invite(text) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
revoke execute on function public.decline_invite(text) from public, anon;
revoke execute on function public.set_contact_paused(uuid, boolean) from public, anon;
revoke execute on function public.start_walk(text, integer, double precision, double precision, uuid[])
  from public, anon;
grant execute on function public.create_invite(text) to authenticated;
grant execute on function public.get_invite(text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.decline_invite(text) to authenticated;
grant execute on function public.set_contact_paused(uuid, boolean) to authenticated;
grant execute on function public.start_walk(text, integer, double precision, double precision, uuid[])
  to authenticated;
