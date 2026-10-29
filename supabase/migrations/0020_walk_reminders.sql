-- SCRUM-64: a calm reminder before the check-in deadline, using SCRUM-7's Web Push setup.
-- Assumption: 5 minutes gives time to respond while walking and matches timerPhase in time.ts.
-- pg_cron checks every minute: normally the reminder is queued with 4–5 minutes left.
-- Nothing extends a deadline automatically. The existing 3-minute grace period is unchanged.
-- Deploy the updated send-walk-push function before running this migration (docs/backend.md).

begin;

alter table public.walks add column reminder_deadline timestamptz;
comment on column public.walks.reminder_deadline is
  'Deadline for which a pre-deadline push was queued, not proof of delivery. No location data.';

-- A queue failure is not marked as success: the next cron run can try again before expiry.
create function public.queue_walk_reminder(walk_id uuid, for_deadline timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  function_url text;
  shared_secret text;
  request_id bigint;
begin
  select decrypted_secret into function_url
  from vault.decrypted_secrets where name = 'walk_push_url';
  select decrypted_secret into shared_secret
  from vault.decrypted_secrets where name = 'walk_push_secret';

  if nullif(btrim(function_url), '') is null or nullif(btrim(shared_secret), '') is null then
    return false;
  end if;

  select net.http_post(
    url := btrim(function_url),
    body := jsonb_build_object('walk_id', walk_id, 'event', 'reminder', 'deadline', for_deadline),
    headers := jsonb_build_object(
      'Content-Type', 'application/json', 'x-walk-push-secret', shared_secret
    )
  ) into request_id;
  return request_id is not null;
end;
$$;

create function public.check_walk_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_walk record;
begin
  for current_walk in
    select id, deadline from public.walks
    where status = 'active'
      and deadline > now()
      and deadline <= now() + interval '5 minutes'
      and reminder_deadline is distinct from deadline
    -- Two overlapping runs cannot queue the same deadline twice. Extensions/check-ins use the
    -- same row lock. A new deadline is eligible again, without erasing any warning history.
    for update skip locked
  loop
    begin
      if public.queue_walk_reminder(current_walk.id, current_walk.deadline) then
        update public.walks set reminder_deadline = current_walk.deadline
        where id = current_walk.id;
      end if;
    exception when others then
      raise warning 'Could not queue a reminder for walk %: %', current_walk.id, sqlerrm;
    end;
  end loop;
end;
$$;

-- The existing RLS still applies to walks. Only the database job can queue these messages.
revoke execute on function public.queue_walk_reminder(uuid, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.check_walk_reminders() from public, anon, authenticated;

select cron.schedule('check-walk-reminders', '* * * * *', 'select public.check_walk_reminders()');

commit;
