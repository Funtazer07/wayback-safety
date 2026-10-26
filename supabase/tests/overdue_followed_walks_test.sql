-- Test for the overdue walks on the Contacts tab (SCRUM-104). Written for 0015; since 0016 the same
-- walks come from followed_walk_statuses, so this checks the overdue walks it returns.
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0016 is run.
-- One transaction that ends with ROLLBACK, so the made-up people and walks are gone afterwards. The
-- last result says "ALL CHECKS PASSED"; a failed check stops the run with "FAIL: ...".
--
-- Made-up people: Anna walks. Sam follows her walk and has Anna in his own list. Pat follows her
-- walk but removed Anna from his own list. Kim is Anna's contact but paused. Eve is a stranger.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000e0001', 'authenticated', 'authenticated', 'anna.test15@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-0000000e0002', 'authenticated', 'authenticated', 'sam.test15@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-0000000e0003', 'authenticated', 'authenticated', 'pat.test15@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-0000000e0004', 'authenticated', 'authenticated', 'kim.test15@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-0000000e0005', 'authenticated', 'authenticated', 'eve.test15@example.com', '{"age_confirmed":"true"}');

update public.profiles set display_name = 'Anna' where id = '00000000-0000-4000-8000-0000000e0001';

insert into public.contacts (id, user_id, contact_user_id, label, status, accepted_at) values
  -- Anna's contacts.
  ('00000000-0000-4000-8000-0000000f0002', '00000000-0000-4000-8000-0000000e0001',
   '00000000-0000-4000-8000-0000000e0002', 'Sam', 'accepted', now()),
  ('00000000-0000-4000-8000-0000000f0003', '00000000-0000-4000-8000-0000000e0001',
   '00000000-0000-4000-8000-0000000e0003', 'Pat', 'accepted', now()),
  ('00000000-0000-4000-8000-0000000f0004', '00000000-0000-4000-8000-0000000e0001',
   '00000000-0000-4000-8000-0000000e0004', 'Kim', 'accepted', now()),
  -- Sam's own link back to Anna. Pat has none.
  ('00000000-0000-4000-8000-0000000f0012', '00000000-0000-4000-8000-0000000e0002',
   '00000000-0000-4000-8000-0000000e0001', 'My sister', 'accepted', now());

-- Two walks by Anna: one overdue, one still on the way.
insert into public.walks
  (id, user_id, destination_label, started_at, deadline, warned_at, status, overdue_at)
values
  ('00000000-0000-4000-8000-0000000d0f01', '00000000-0000-4000-8000-0000000e0001',
   'Stratumseind 32', now() - interval '40 minutes', now() - interval '10 minutes',
   now() - interval '9 minutes', 'overdue', now() - interval '4 minutes');
insert into public.walks (id, user_id, destination_label, started_at, deadline) values
  ('00000000-0000-4000-8000-0000000d0f02', '00000000-0000-4000-8000-0000000e0001',
   'Kruisstraat 10', now() - interval '5 minutes', now() + interval '20 minutes');

insert into public.walk_contacts (walk_id, contact_id) values
  ('00000000-0000-4000-8000-0000000d0f01', '00000000-0000-4000-8000-0000000f0002'),
  ('00000000-0000-4000-8000-0000000d0f01', '00000000-0000-4000-8000-0000000f0003'),
  ('00000000-0000-4000-8000-0000000d0f01', '00000000-0000-4000-8000-0000000f0004'),
  ('00000000-0000-4000-8000-0000000d0f02', '00000000-0000-4000-8000-0000000f0002');

-- Kim is paused after being added to the walk.
update public.contacts set status = 'paused' where id = '00000000-0000-4000-8000-0000000f0004';

set local role authenticated;

-- ---------- Sam: the overdue walk, next to his own row for Anna ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000e0002","role":"authenticated"}', true);

do $$ begin
  assert (select count(*) from (select * from public.followed_walk_statuses() where status = 'overdue') as overdue_walks) = 1,
    'FAIL: Sam should see exactly one overdue walk, not the one still on the way';
  assert (select walk_id = '00000000-0000-4000-8000-0000000d0f01' and walker_name = 'Anna'
            and contact_id = '00000000-0000-4000-8000-0000000f0012' and overdue_at is not null
          from (select * from public.followed_walk_statuses() where status = 'overdue') as overdue_walks),
    'FAIL: Sam''s overdue walk has the wrong walk, name or contact row';
end $$;

-- ---------- Pat removed Anna from his list: still sees the walk, without a row ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000e0003","role":"authenticated"}', true);

do $$ begin
  assert (select contact_id is null from (select * from public.followed_walk_statuses() where status = 'overdue') as overdue_walks
          where walk_id = '00000000-0000-4000-8000-0000000d0f01'),
    'FAIL: Pat should see the overdue walk, with no contact row of his own';
end $$;

-- ---------- A paused contact and a stranger see nothing ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000e0004","role":"authenticated"}', true);

do $$ begin
  assert (select count(*) from (select * from public.followed_walk_statuses() where status = 'overdue') as overdue_walks) = 0,
    'FAIL: a paused contact sees an overdue walk';
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000e0005","role":"authenticated"}', true);

do $$ begin
  assert (select count(*) from (select * from public.followed_walk_statuses() where status = 'overdue') as overdue_walks) = 0,
    'FAIL: a stranger sees an overdue walk';
end $$;

-- ---------- After the check-in the walk is gone from the list ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000e0001","role":"authenticated"}', true);
select public.check_in('00000000-0000-4000-8000-0000000d0f01');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000e0002","role":"authenticated"}', true);

do $$ begin
  assert (select count(*) from (select * from public.followed_walk_statuses() where status = 'overdue') as overdue_walks) = 0,
    'FAIL: a walk that was checked in still shows as overdue';
end $$;

reset role;
select 'ALL CHECKS PASSED' as result;

rollback;
