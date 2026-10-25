-- SCRUM-73: a scheduled check for walks that ran past their deadline.
--
-- Every minute the database itself looks for late walks (pg_cron, decided in SCRUM-66). Nothing
-- runs on the phone, so this also works when the phone is locked, the app is closed or the battery
-- is dead. Two steps, each done once per deadline:
--
-- 1. Warn: an active walk whose deadline has passed gets "Are you OK?" on the walker's own phone.
--    The time is saved in warned_at.
-- 2. Overdue: when the walk is still active GRACE_PERIOD after that warning, its status becomes
--    'overdue' and the time is saved in overdue_at. Alerting the contacts at that moment is SCRUM-74.
--
-- The grace period counts from the warning, not from the deadline. If the check runs late (for
-- example right after a paused free project wakes up), the user still gets the full grace period
-- after the warning before anyone is alerted.
--
-- Extending a walk (extend_walk, 0006) moves the deadline after warned_at. A warning only counts
-- for the deadline it was sent for, so the walk can be warned again when the new deadline passes,
-- and it cannot become overdue on the old warning.
--
-- Needs 0009 and 0010 (push), and the send-walk-push Edge Function deployed with the are_you_ok
-- event (docs/backend.md, "Late walks").

create extension if not exists pg_cron;

-- Both empty until the step happened.
alter table public.walks
  add column warned_at timestamptz,
  add column overdue_at timestamptz;

-- Nothing in the app set 'overdue' before this file, so this only touches test rows changed by hand
-- in the Table Editor. Without it the checks below would refuse those rows.
update public.walks
set warned_at = deadline, overdue_at = deadline
where status = 'overdue' and overdue_at is null;

alter table public.walks
  add constraint walks_warned_after_start check (warned_at >= started_at),
  -- A walk is never overdue without a warning first, and overdue always has a time.
  add constraint walks_overdue_after_warning
    check (overdue_at is null or (warned_at is not null and overdue_at >= warned_at)),
  add constraint walks_overdue_has_time check (status <> 'overdue' or overdue_at is not null);

-- Queues one push message about a walk. Used by the trigger from 0009 and by the late-walk check
-- below. Never fails: a problem with push becomes a warning in Logs > Postgres, because a walk (or
-- the late-walk check for everyone else) matters more than one message (see 0010).
create function public.queue_walk_push(walk_id uuid, walk_event text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  function_url text;
  shared_secret text;
begin
  -- Kept in Supabase Vault (encrypted), not in this file: the repository is public.
  select decrypted_secret into function_url
  from vault.decrypted_secrets where name = 'walk_push_url';
  select decrypted_secret into shared_secret
  from vault.decrypted_secrets where name = 'walk_push_secret';

  -- Not set up yet: carry on without a message.
  if function_url is null or shared_secret is null then
    return;
  end if;

  perform net.http_post(
    url := btrim(function_url),
    body := jsonb_build_object('walk_id', walk_id, 'event', walk_event),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-walk-push-secret', shared_secret
    )
  );
exception
  when others then
    raise warning 'queue_walk_push could not queue the % message for walk %: %',
      walk_event, walk_id, sqlerrm;
end;
$$;

-- The trigger function from 0009/0010, now using the helper above. Same behaviour.
create or replace function public.send_walk_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The names match WalkEvent in supabase/functions/send-walk-push/walkPush.ts.
  perform public.queue_walk_push(
    new.id,
    case
      when tg_op = 'INSERT' then 'started'
      when new.status = 'safe' then 'home_safe'
      else 'cancelled'
    end
  );
  return new;
end;
$$;

-- The check itself. pg_cron runs it every minute (bottom of this file).
create function public.check_late_walks()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Assumption: 5 minutes, from the 05:00 on the SCRUM-72 prototype, until SCRUM-71 (research)
  -- decides. Keep it the same as GRACE_MINUTES in supabase/functions/send-walk-push/walkPush.ts,
  -- which tells the user how long they have.
  grace_period constant interval := interval '5 minutes';
  late_walk record;
begin
  -- Step 2 first, so a walk warned in this same run never jumps straight to overdue.
  update public.walks
  set status = 'overdue', overdue_at = now()
  where status = 'active'
    -- The warning was for the current deadline (not one from before an extension)...
    and warned_at >= deadline
    -- ...and the grace period after it is over.
    and warned_at + grace_period <= now();

  -- Step 1. "warned_at < deadline" also catches a walk that was extended after an earlier warning.
  for late_walk in
    update public.walks
    set warned_at = now()
    where status = 'active'
      and deadline <= now()
      and (warned_at is null or warned_at < deadline)
    returning id
  loop
    perform public.queue_walk_push(late_walk.id, 'are_you_ok');
  end loop;
end;
$$;

-- Only the database runs these; the app cannot call them.
revoke execute on function public.queue_walk_push(uuid, text) from public, anon, authenticated;
revoke execute on function public.send_walk_push() from public, anon, authenticated;
revoke execute on function public.check_late_walks() from public, anon, authenticated;

-- Assumption: every minute, as SCRUM-73 asks. The warning can then come up to a minute after the
-- deadline. Running this file again replaces the job instead of adding a second one.
select cron.schedule('check-late-walks', '* * * * *', 'select public.check_late_walks()');
