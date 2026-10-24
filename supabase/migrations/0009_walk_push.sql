-- SCRUM-69: the database calls the send-walk-push Edge Function when a walk starts, is checked in
-- or is cancelled, so its contacts get a push notification.
--
-- Cancelled was added on 24 Oct: SCRUM-63 and SCRUM-12 promise that contacts are told, and no
-- other subtask built it.
--
-- Decided on 24 Oct: a trigger in the database, not the app, makes the call. The message then also
-- goes out when the phone loses its connection or is locked right after the tap. SCRUM-73's
-- scheduled check will use the same Edge Function.
--
-- Needs, before this file is run:
-- - 0005_contacts.sql (walk_contacts), 0006_extend_and_cancel.sql (the 'cancelled' status) and
--   0007_push_subscriptions.sql (SCRUM-68).
-- - The Edge Function deployed and two Vault secrets set (docs/backend.md, "Sending push"). Without
--   the secrets nothing is sent, but walks keep working.

-- pg_net lets the database make a web request. It sends it in the background after the transaction
-- is saved, so a slow or failing Edge Function never slows down or breaks starting a walk. It also
-- means the walk's contacts (saved by start_walk right after the walk itself) are there by then.
create extension if not exists pg_net with schema extensions;

create function public.send_walk_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  walk_event text;
  function_url text;
  shared_secret text;
begin
  -- The names match WalkEvent in supabase/functions/send-walk-push/walkPush.ts.
  walk_event := case
    when tg_op = 'INSERT' then 'started'
    when new.status = 'safe' then 'home_safe'
    else 'cancelled'
  end;

  -- Kept in Supabase Vault (encrypted), not in this file: the repository is public.
  select decrypted_secret into function_url
  from vault.decrypted_secrets where name = 'walk_push_url';
  select decrypted_secret into shared_secret
  from vault.decrypted_secrets where name = 'walk_push_secret';

  -- Not set up yet: the walk carries on without a message.
  if function_url is null or shared_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := function_url,
    body := jsonb_build_object('walk_id', new.id, 'event', walk_event),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-walk-push-secret', shared_secret
    )
  );
  return new;
end;
$$;

create trigger walks_push_when_started
  after insert on public.walks
  for each row execute function public.send_walk_push();

-- Only the moment the status becomes 'safe' (check_in, 0004_check_in.sql) or 'cancelled'
-- (cancel_walk, 0006_extend_and_cancel.sql). Not on extending (only the deadline changes), not on a
-- location update, and not on 'overdue': the late-walk alert is SCRUM-74's own message.
create trigger walks_push_when_ended
  after update of status on public.walks
  for each row
  when (new.status in ('safe', 'cancelled') and old.status is distinct from new.status)
  execute function public.send_walk_push();

-- Only the triggers run it; the app cannot call it.
revoke execute on function public.send_walk_push() from public, anon, authenticated;
