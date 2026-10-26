-- Test for supabase/migrations/0016_contact_alerts_and_walk_status.sql (SCRUM-103, SCRUM-115):
-- what the Contacts tab may know about each person.
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0018 is run
-- (0018 adds started_at to followed_walk_statuses).
-- One transaction that ends with ROLLBACK, so the made-up people and walks are gone afterwards. The
-- last result says "ALL CHECKS PASSED"; a failed check stops the run with "FAIL: ...".
--
-- Made-up people: Sam looks out for Anna, Ben and Kim, and they look out for him. Anna allowed
-- notifications, Ben did not. Anna is on the way home, Ben got home 2 hours ago, Kim got home 2
-- days ago. Eve is a stranger.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000100001', 'authenticated', 'authenticated', 'sam.test16@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000100002', 'authenticated', 'authenticated', 'anna.test16@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000100003', 'authenticated', 'authenticated', 'ben.test16@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000100004', 'authenticated', 'authenticated', 'kim.test16@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000100005', 'authenticated', 'authenticated', 'eve.test16@example.com', '{"age_confirmed":"true"}');

update public.profiles set display_name = 'Anna' where id = '00000000-0000-4000-8000-000000100002';

insert into public.contacts (id, user_id, contact_user_id, label, status, accepted_at) values
  -- Sam's own list.
  ('00000000-0000-4000-8000-000000110002', '00000000-0000-4000-8000-000000100001',
   '00000000-0000-4000-8000-000000100002', 'Anna', 'accepted', now()),
  ('00000000-0000-4000-8000-000000110003', '00000000-0000-4000-8000-000000100001',
   '00000000-0000-4000-8000-000000100003', 'Ben', 'accepted', now()),
  ('00000000-0000-4000-8000-000000110004', '00000000-0000-4000-8000-000000100001',
   '00000000-0000-4000-8000-000000100004', 'Kim', 'accepted', now()),
  -- The links back: Sam looks out for each of them.
  ('00000000-0000-4000-8000-000000120002', '00000000-0000-4000-8000-000000100002',
   '00000000-0000-4000-8000-000000100001', 'Sam', 'accepted', now()),
  ('00000000-0000-4000-8000-000000120003', '00000000-0000-4000-8000-000000100003',
   '00000000-0000-4000-8000-000000100001', 'Sam', 'accepted', now()),
  ('00000000-0000-4000-8000-000000120004', '00000000-0000-4000-8000-000000100004',
   '00000000-0000-4000-8000-000000100001', 'Sam', 'accepted', now());

-- Only Anna's phone can receive alerts.
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('00000000-0000-4000-8000-000000100002', 'https://fcm.googleapis.com/fcm/send/anna-test16',
   'key-p256dh', 'key-auth');

insert into public.walks
  (id, user_id, destination_label, started_at, deadline, status, checked_in_at)
values
  -- Anna: on the way, home in 20 minutes.
  ('00000000-0000-4000-8000-0000001d0002', '00000000-0000-4000-8000-000000100002',
   'Kruisstraat 10', now() - interval '10 minutes', now() + interval '20 minutes', 'active', null),
  -- Ben: home 2 hours ago.
  ('00000000-0000-4000-8000-0000001d0003', '00000000-0000-4000-8000-000000100003',
   'Stratumseind 32', now() - interval '3 hours', now() - interval '2 hours', 'safe',
   now() - interval '2 hours'),
  -- Kim: home 2 days ago, old news.
  ('00000000-0000-4000-8000-0000001d0004', '00000000-0000-4000-8000-000000100004',
   'Woenselse Markt 1', now() - interval '49 hours', now() - interval '48 hours', 'safe',
   now() - interval '48 hours');

insert into public.walk_contacts (walk_id, contact_id) values
  ('00000000-0000-4000-8000-0000001d0002', '00000000-0000-4000-8000-000000120002'),
  ('00000000-0000-4000-8000-0000001d0003', '00000000-0000-4000-8000-000000120003'),
  ('00000000-0000-4000-8000-0000001d0004', '00000000-0000-4000-8000-000000120004');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000100001","role":"authenticated"}', true);

-- ---------- SCRUM-103: who can receive alerts ----------
do $$ begin
  assert (select can_receive_alerts from public.contact_alert_status()
          where contact_id = '00000000-0000-4000-8000-000000110002'),
    'FAIL: Anna allowed notifications but is shown as unable to receive alerts';
  assert (select not can_receive_alerts from public.contact_alert_status()
          where contact_id = '00000000-0000-4000-8000-000000110003'),
    'FAIL: Ben never allowed notifications but is shown as able to receive alerts';
end $$;

-- ---------- SCRUM-115: the walk status per person ----------
do $$ begin
  assert (select status = 'active' and walker_name = 'Anna' and started_at is not null
            and contact_id = '00000000-0000-4000-8000-000000110002'
          from public.followed_walk_statuses()
          where walk_id = '00000000-0000-4000-8000-0000001d0002'),
    'FAIL: Anna''s walk on the way is missing, or not next to Sam''s row for Anna';
  assert (select status = 'safe' and checked_in_at is not null
          from public.followed_walk_statuses()
          where walk_id = '00000000-0000-4000-8000-0000001d0003'),
    'FAIL: Ben got home 2 hours ago, that should still show';
  assert not exists (select 1 from public.followed_walk_statuses()
                     where walk_id = '00000000-0000-4000-8000-0000001d0004'),
    'FAIL: Kim''s walk from 2 days ago still shows';
end $$;

-- ---------- An overdue walk wins over a newer one by the same walker ----------
reset role;
update public.walks
set deadline = now() - interval '6 minutes', warned_at = now() - interval '5 minutes',
    status = 'overdue', overdue_at = now()
where id = '00000000-0000-4000-8000-0000001d0002';
insert into public.walks (id, user_id, destination_label, started_at, deadline, status, cancelled_at)
values
  ('00000000-0000-4000-8000-0000001d0012', '00000000-0000-4000-8000-000000100002',
   'Kruisstraat 10', now() - interval '2 minutes', now() + interval '20 minutes', 'cancelled',
   now() - interval '1 minute');
insert into public.walk_contacts (walk_id, contact_id) values
  ('00000000-0000-4000-8000-0000001d0012', '00000000-0000-4000-8000-000000120002');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000100001","role":"authenticated"}', true);

do $$ begin
  assert (select count(*) from public.followed_walk_statuses()
          where walker_name = 'Anna') = 1,
    'FAIL: Anna should have exactly one walk on Sam''s Contacts tab';
  assert (select status = 'overdue' from public.followed_walk_statuses()
          where walker_name = 'Anna'),
    'FAIL: a newer cancelled walk hides Anna''s overdue walk';
end $$;

-- ---------- A stranger sees nothing ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000100005","role":"authenticated"}', true);

do $$ begin
  assert (select count(*) from public.contact_alert_status()) = 0,
    'FAIL: a stranger sees someone''s alert status';
  assert (select count(*) from public.followed_walk_statuses()) = 0,
    'FAIL: a stranger sees someone''s walk';
end $$;

reset role;
select 'ALL CHECKS PASSED' as result;

rollback;
