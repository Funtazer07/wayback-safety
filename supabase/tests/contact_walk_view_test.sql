-- Test for supabase/migrations/0013_contact_walk_view.sql (SCRUM-102): who may see a walk, and
-- what they see.
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0013 is run.
-- One transaction that ends with ROLLBACK, so the made-up people and walk are gone afterwards. The
-- last result says "ALL CHECKS PASSED"; a failed check stops the run with "FAIL: ...".
--
-- Made-up people: Anna walks, Sam is her contact on this walk, Pat is her contact but paused, Eve
-- is a stranger.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000a0001', 'authenticated', 'authenticated', 'anna.test13@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-0000000a0002', 'authenticated', 'authenticated', 'sam.test13@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-0000000a0003', 'authenticated', 'authenticated', 'pat.test13@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-0000000a0004', 'authenticated', 'authenticated', 'eve.test13@example.com', '{"age_confirmed":"true"}');

update public.profiles set display_name = 'Anna' where id = '00000000-0000-4000-8000-0000000a0001';

insert into public.contacts (id, user_id, contact_user_id, label, status, accepted_at) values
  ('00000000-0000-4000-8000-0000000c0002', '00000000-0000-4000-8000-0000000a0001',
   '00000000-0000-4000-8000-0000000a0002', 'Sam', 'accepted', now()),
  ('00000000-0000-4000-8000-0000000c0003', '00000000-0000-4000-8000-0000000a0001',
   '00000000-0000-4000-8000-0000000a0003', 'Pat', 'accepted', now());

-- Anna's walk to "Stratumseind 32", still on the way, with a location from a minute ago.
insert into public.walks
  (id, user_id, destination_label, started_at, deadline, last_lat, last_lng, last_location_at)
values
  ('00000000-0000-4000-8000-0000000d0a1f', '00000000-0000-4000-8000-0000000a0001',
   'Stratumseind 32', now() - interval '20 minutes', now() + interval '10 minutes',
   51.4385, 5.4791, now() - interval '1 minute');

insert into public.walk_contacts (walk_id, contact_id) values
  ('00000000-0000-4000-8000-0000000d0a1f', '00000000-0000-4000-8000-0000000c0002'),
  ('00000000-0000-4000-8000-0000000d0a1f', '00000000-0000-4000-8000-0000000c0003');

-- Pat is paused after being added to the walk.
update public.contacts set status = 'paused' where id = '00000000-0000-4000-8000-0000000c0003';

set local role authenticated;

-- ---------- While Anna is on the way, Sam sees no location ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000a0002","role":"authenticated"}', true);

do $$ begin
  assert (select status = 'active' and walker_name = 'Anna' and last_lat is null
            and last_location_at is null
          from public.followed_walk('00000000-0000-4000-8000-0000000d0a1f')),
    'FAIL: a contact could see the location before the walk was overdue';
end $$;

-- ---------- Overdue: Sam sees the last location and its time ----------
reset role;
update public.walks
set deadline = now() - interval '6 minutes', warned_at = now() - interval '5 minutes',
    status = 'overdue', overdue_at = now()
where id = '00000000-0000-4000-8000-0000000d0a1f';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000a0002","role":"authenticated"}', true);

do $$ begin
  assert (select status = 'overdue' and last_lat = 51.4385 and last_lng = 5.4791
            and last_location_at is not null
          from public.followed_walk('00000000-0000-4000-8000-0000000d0a1f')),
    'FAIL: a contact could not see the last location of an overdue walk';
end $$;

-- ---------- Sam cannot read the walk row itself (destination, route) ----------
do $$ begin
  assert (select count(*) from public.walks where id = '00000000-0000-4000-8000-0000000d0a1f') = 0,
    'FAIL: a contact can read the whole walk row, including the destination';
end $$;

-- ---------- A paused contact and a stranger see nothing ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000a0003","role":"authenticated"}', true);

do $$ begin
  perform public.followed_walk('00000000-0000-4000-8000-0000000d0a1f');
  raise exception 'FAIL: a paused contact could see the walk';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000a0004","role":"authenticated"}', true);

do $$ begin
  perform public.followed_walk('00000000-0000-4000-8000-0000000d0a1f');
  raise exception 'FAIL: a stranger could see the walk';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  if sqlerrm <> 'This walk is not shared with you' then
    raise exception 'FAIL: wrong message for a stranger: %', sqlerrm;
  end if;
end $$;

-- ---------- After the check-in: safe, and no location any more ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000a0001","role":"authenticated"}', true);
select public.check_in('00000000-0000-4000-8000-0000000d0a1f');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000a0002","role":"authenticated"}', true);

do $$ begin
  assert (select status = 'safe' and checked_in_at is not null and last_lat is null
          from public.followed_walk('00000000-0000-4000-8000-0000000d0a1f')),
    'FAIL: after the check-in the contact should see "safe" and no location';
end $$;

reset role;
select 'ALL CHECKS PASSED' as result;

rollback;
