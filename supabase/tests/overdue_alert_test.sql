-- Test for supabase/migrations/0012_overdue_alert.sql (SCRUM-74).
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0012 is run
-- and "Sending push" is set up (the Vault secrets walk_push_url and walk_push_secret exist).
-- Everything happens in one transaction that ends with ROLLBACK: the made-up walker is gone
-- afterwards, and the queued web requests are thrown away, so nobody gets a real alert. The last
-- result says "ALL CHECKS PASSED"; a failed check stops the run with "FAIL: ...".

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000f001', 'authenticated', 'authenticated',
   'anna.test12@example.com', '{"age_confirmed":"true"}');

-- A walk that was warned 5 minutes ago and still has a location from before the deadline.
insert into public.walks
  (id, user_id, destination_label, started_at, deadline, warned_at, last_lat, last_lng,
   last_location_at)
values
  ('00000000-0000-4000-8000-0000000f0a1f', '00000000-0000-4000-8000-00000000f001', 'Home',
   now() - interval '40 minutes', now() - interval '10 minutes', now() - interval '5 minutes',
   51.4385, 5.4791, now() - interval '12 minutes');

-- The messages queued for this walk so far, by event name. pg_net keeps them in this queue until
-- the transaction is saved, which this test never does.
create function pg_temp.events_for_test_walk() returns setof text language sql as $$
  select convert_from(body, 'UTF8')::jsonb ->> 'event'
  from net.http_request_queue
  where convert_from(body, 'UTF8')::jsonb ->> 'walk_id' = '00000000-0000-4000-8000-0000000f0a1f'
$$;

-- ---------- Becoming overdue sends the alert, once ----------
select public.check_late_walks();
select public.check_late_walks();

do $$ begin
  assert (select status = 'overdue' from public.walks
          where id = '00000000-0000-4000-8000-0000000f0a1f'),
    'FAIL: the walk did not become overdue';
  assert (select count(*) from pg_temp.events_for_test_walk() as event where event = 'overdue') = 1,
    'FAIL: expected exactly one alert (is walk_push_url set in Vault?)';
end $$;

-- ---------- The location stays for the first 24 hours ----------
-- All times move back together: the database refuses an overdue time before the warning, or a
-- warning before the walk started.
update public.walks
set overdue_at = now() - interval '23 hours', warned_at = now() - interval '23 hours 1 minute',
    deadline = now() - interval '23 hours 2 minutes', started_at = now() - interval '24 hours'
where id = '00000000-0000-4000-8000-0000000f0a1f';

select public.check_late_walks();

do $$ begin
  assert (select last_location_at is not null from public.walks
          where id = '00000000-0000-4000-8000-0000000f0a1f'),
    'FAIL: the location was erased before 24 hours';
end $$;

-- ---------- ...and is erased after them ----------
update public.walks
set overdue_at = now() - interval '25 hours', warned_at = now() - interval '25 hours 1 minute',
    deadline = now() - interval '25 hours 2 minutes', started_at = now() - interval '26 hours'
where id = '00000000-0000-4000-8000-0000000f0a1f';

select public.check_late_walks();

do $$ begin
  assert (select last_lat is null and last_lng is null and last_location_at is null
          from public.walks where id = '00000000-0000-4000-8000-0000000f0a1f'),
    'FAIL: the location of an overdue walk was kept longer than 24 hours';
end $$;

-- ---------- An app left open cannot put it back ----------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated"}', true);

do $$ begin
  perform public.update_walk_location('00000000-0000-4000-8000-0000000f0a1f', 51.44, 5.47);
  raise exception 'FAIL: an overdue walk older than 24 hours accepted a new location';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- ---------- Checking in afterwards tells the contacts ----------
select public.check_in('00000000-0000-4000-8000-0000000f0a1f');

reset role;

do $$ begin
  assert (select count(*) from pg_temp.events_for_test_walk() as event where event = 'home_safe') = 1,
    'FAIL: checking in after the alert did not tell the contacts';
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
