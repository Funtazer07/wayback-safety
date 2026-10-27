-- SCRUM-64. Run after 0021 in a local/test database. Everything is rolled back.
-- Replaces only the queue helper inside this transaction, so no real push can be sent.
begin;
create temporary table reminder_requests (walk_id uuid, deadline timestamptz);
create or replace function public.queue_walk_reminder(walk_id uuid, for_deadline timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into pg_temp.reminder_requests values (walk_id, for_deadline);
  return true;
end;
$$;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000e064', 'authenticated', 'authenticated',
   'anna.reminder@example.com', '{"age_confirmed":"true"}');
insert into public.walks (id, user_id, destination_label, started_at, deadline) values
  ('00000000-0000-4000-8000-000000000064', '00000000-0000-4000-8000-00000000e064',
   'Home', now() - interval '10 minutes', now() + interval '2 minutes');

select public.check_walk_reminders();
do $$ begin
  assert not exists (select 1 from pg_temp.reminder_requests
    where walk_id = '00000000-0000-4000-8000-000000000064'), 'FAIL: too early';
end $$;

update public.walks set deadline = now() + interval '1 minute'
where id = '00000000-0000-4000-8000-000000000064';
select public.check_walk_reminders();
select public.check_walk_reminders();
do $$ begin
  assert (select count(*) from pg_temp.reminder_requests
    where walk_id = '00000000-0000-4000-8000-000000000064') = 1, 'FAIL: not once per deadline';
end $$;

-- Extending changes the deadline, not the previous queue marker.
update public.walks set deadline = now() + interval '15 minutes'
where id = '00000000-0000-4000-8000-000000000064';
select public.check_walk_reminders();
update public.walks set deadline = now() + interval '30 seconds'
where id = '00000000-0000-4000-8000-000000000064';
select public.check_walk_reminders();
do $$ begin
  assert (select count(*) from pg_temp.reminder_requests
    where walk_id = '00000000-0000-4000-8000-000000000064') = 2, 'FAIL: new deadline not reminded';
end $$;

-- Expired walks are handled by check_late_walks, never by the pre-deadline reminder.
update public.walks set deadline = now(), reminder_deadline = null
where id = '00000000-0000-4000-8000-000000000064';
select public.check_walk_reminders();
do $$ begin
  assert (select reminder_deadline is null from public.walks
    where id = '00000000-0000-4000-8000-000000000064'), 'FAIL: expired walk reminded';
end $$;

update public.walks set status = 'safe', checked_in_at = now(), deadline = now() + interval '3 minutes'
where id = '00000000-0000-4000-8000-000000000064';
select public.check_walk_reminders();
do $$ begin
  assert (select reminder_deadline is null from public.walks
    where id = '00000000-0000-4000-8000-000000000064'), 'FAIL: safe walk reminded';
end $$;
update public.walks set status = 'cancelled', checked_in_at = null, cancelled_at = now()
where id = '00000000-0000-4000-8000-000000000064';
select public.check_walk_reminders();
do $$ begin
  assert (select reminder_deadline is null from public.walks
    where id = '00000000-0000-4000-8000-000000000064'), 'FAIL: cancelled walk reminded';
end $$;

-- A failed queue is retried, rather than silently marked as reminded.
create or replace function public.queue_walk_reminder(walk_id uuid, for_deadline timestamptz)
returns boolean language sql security definer set search_path = '' as $$ select false $$;
update public.walks set status = 'active', cancelled_at = null
where id = '00000000-0000-4000-8000-000000000064';
select public.check_walk_reminders();
do $$ begin
  assert (select reminder_deadline is null from public.walks
    where id = '00000000-0000-4000-8000-000000000064'), 'FAIL: failed queue marked successful';
  assert (select count(*) from cron.job where jobname = 'check-walk-reminders'
    and schedule = '10 seconds') = 1, 'FAIL: cron job missing';
end $$;

set local role authenticated;
do $$ begin
  perform public.check_walk_reminders();
  raise exception 'FAIL: client could run reminder check';
exception when insufficient_privilege then null;
end $$;
reset role;
select 'ALL CHECKS PASSED' as result;
rollback;
