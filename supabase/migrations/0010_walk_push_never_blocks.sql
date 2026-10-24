-- SCRUM-69: a problem with push must never stop a walk from starting, being checked in or being
-- cancelled.
--
-- Found while testing on 24 Oct: with a wrong value in the Vault secret walk_push_url (a whole curl
-- command instead of the address), net.http_post refused the address on the spot. That error ran
-- inside the trigger from 0009_walk_push.sql, so start_walk failed and the user could not start a
-- walk at all. In a safety app the walk matters more than the message about it.
--
-- This replaces send_walk_push with the same function, plus one change: any error while preparing
-- or queuing the web request is turned into a warning in the database log, and the walk carries on.
-- The triggers from 0009 stay as they are; they call the function by name.

create or replace function public.send_walk_push()
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

  begin
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
      url := btrim(function_url),
      body := jsonb_build_object('walk_id', new.id, 'event', walk_event),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-walk-push-secret', shared_secret
      )
    );
  exception
    when others then
      -- Shown in Supabase under Logs > Postgres. The contacts miss this one message, but the walk
      -- itself is saved.
      raise warning 'send_walk_push could not queue the % message for walk %: %',
        walk_event, new.id, sqlerrm;
  end;

  return new;
end;
$$;

-- Same as in 0009: only the triggers run it; the app cannot call it.
revoke execute on function public.send_walk_push() from public, anon, authenticated;
