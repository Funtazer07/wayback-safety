-- SCRUM-68: push subscriptions.
--
-- Alerts go out by Web Push only (SCRUM-66, decided 13 Oct). When someone allows notifications, the
-- browser gives the app a "push subscription": an address at Apple's or Google's push service plus
-- two keys to encrypt the message. The sending function (SCRUM-69) and the server check (SCRUM-73)
-- read this table to reach a phone, also when it is locked or the app is closed.
--
-- One row per phone or browser, so a user with two devices has two rows.
--
-- Data minimisation: we store only what is needed to send a push. No device name, no browser, no
-- IP address. The row is deleted when the user turns notifications off, and with the account.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The push service address. Unique: one phone belongs to one account at a time.
  endpoint text not null unique
    check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  -- The two keys that encrypt the message for this phone (base64url, from the browser).
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  created_at timestamptz not null default now()
);

-- Row level security, same pattern as 0001_profiles.sql.
alter table public.push_subscriptions enable row level security;

create policy "Users can read their own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Turning notifications off on a phone deletes that phone's row.
create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert or update policy on purpose: the app calls save_push_subscription below.

-- Saves this phone's subscription for the logged-in user. Safe to call again with the same phone:
-- the keys are refreshed. If the phone was last used by another account (someone signed out and a
-- friend signed in), it now belongs to the logged-in user only, so alerts never reach the wrong
-- person.
--
-- The inputs start with push_ because an input called "auth" would clash with auth.uid().
create function public.save_push_subscription(
  push_endpoint text,
  push_p256dh text,
  push_auth text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ((select auth.uid()), push_endpoint, push_p256dh, push_auth)
  on conflict on constraint push_subscriptions_endpoint_key do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        created_at = now();
end;
$$;

-- Only logged-in users may call the function.
revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
