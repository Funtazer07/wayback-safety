-- Test for supabase/migrations/0027_sos.sql (SCRUM-78): the SOS function.
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0027 is run
-- and "Sending push" is set up (the Vault secrets walk_push_url and walk_push_secret exist).
-- One transaction that ends with ROLLBACK: the made-up people and walks are gone afterwards, and
-- the queued web requests are thrown away, so nobody gets a real alert. The last result says
-- "ALL CHECKS PASSED"; a failed check stops the run with "FAIL: ...".
--
-- Made-up people: Anna walks and presses SOS, Sam is her contact on this walk, Eve is a stranger.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000270001', 'authenticated', 'authenticated', 'anna.test27@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000270002', 'authenticated', 'authenticated', 'sam.test27@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000270004', 'authenticated', 'authenticated', 'eve.test27@example.com', '{"age_confirmed":"true"}');

update public.profiles set display_name = 'Anna' where id = '00000000-0000-4000-8000-000000270001';

insert into public.contacts (id, user_id, contact_user_id, label, status, accepted_at) values
  ('00000000-0000-4000-8000-0000002c0002', '00000000-0000-4000-8000-000000270001',
   '00000000-0000-4000-8000-000000270002', 'Sam', 'accepted', now());

-- Anna's walk, still on the way, never warned, with a location from 5 minutes ago near
-- Stratumseind.
insert into public.walks
  (id, user_id, destination_label, started_at, deadline, last_lat, last_lng, last_location_at)
values
  ('00000000-0000-4000-8000-0000002d0a1f', '00000000-0000-4000-8000-000000270001', 'Home',
   now() - interval '10 minutes', now() + interval '15 minutes',
   51.4385, 5.4791, now() - interval '5 minutes');

insert into public.walk_contacts (walk_id, contact_id) values
  ('00000000-0000-4000-8000-0000002d0a1f', '00000000-0000-4000-8000-0000002c0002');

-- The messages queued for this walk so far, by event name. pg_net keeps them in this queue until
-- the transaction is saved, which this test never does.
create function pg_temp.events_for_test_walk() returns setof text language sql as $$
  select convert_from(body, 'UTF8')::jsonb ->> 'event'
  from net.http_request_queue
  where convert_from(body, 'UTF8')::jsonb ->> 'walk_id' = '00000000-0000-4000-8000-0000002d0a1f'
$$;

set local role authenticated;

-- ---------- A stranger cannot send an SOS for Anna's walk ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000270004","role":"authenticated"}', true);

do $$ begin
  perform public.send_sos('00000000-0000-4000-8000-0000002d0a1f');
  raise exception 'FAIL: a stranger could send an SOS for someone else''s walk';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- ---------- Half a location is refused ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000270001","role":"authenticated"}', true);

do $$ begin
  perform public.send_sos('00000000-0000-4000-8000-0000002d0a1f', 51.44, null);
  raise exception 'FAIL: an SOS with only a latitude was accepted';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- ---------- Anna presses SOS with her position on Kerkstraat ----------
select public.send_sos('00000000-0000-4000-8000-0000002d0a1f', 51.4379, 5.4801);

reset role;

do $$ begin
  assert (select status = 'overdue' and sos_at is not null and sos_at = overdue_at
            and warned_at is not null
            and last_lat = 51.4379 and last_lng = 5.4801 and last_location_at = now()
          from public.walks where id = '00000000-0000-4000-8000-0000002d0a1f'),
    'FAIL: the SOS did not make the walk overdue with the SOS time and the new location';
  assert (select count(*) from pg_temp.events_for_test_walk() as event where event = 'sos') = 1,
    'FAIL: expected exactly one SOS alert (is walk_push_url set in Vault?)';
  assert (select count(*) from pg_temp.events_for_test_walk() as event where event = 'overdue') = 0,
    'FAIL: an SOS also sent the missed check-in alert';
end $$;

-- ---------- Sam sees that Anna asked for help, and where she was ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000270002","role":"authenticated"}', true);

do $$ begin
  assert (select sos_at is not null and last_lat = 51.4379
          from public.followed_walk('00000000-0000-4000-8000-0000002d0a1f')),
    'FAIL: the contact did not see the SOS time and the last location';
  assert (select sos_at is not null and status = 'overdue'
          from public.followed_walk_statuses()
          where walk_id = '00000000-0000-4000-8000-0000002d0a1f'),
    'FAIL: the Contacts tab did not get the SOS time';
end $$;

-- ---------- A second SOS is refused: the walk is no longer active ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000270001","role":"authenticated"}', true);

do $$ begin
  perform public.send_sos('00000000-0000-4000-8000-0000002d0a1f');
  raise exception 'FAIL: a second SOS was accepted on an overdue walk';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- ---------- Anna checks in afterwards: the contacts hear she is safe ----------
select public.check_in('00000000-0000-4000-8000-0000002d0a1f');

reset role;

do $$ begin
  assert (select count(*) from pg_temp.events_for_test_walk() as event where event = 'home_safe') = 1,
    'FAIL: checking in after the SOS did not tell the contacts';
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
