-- Test for supabase/migrations/0019_im_watching.sql (SCRUM-114): "I'm watching".
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0019 is run.
-- One transaction that ends with ROLLBACK, so the made-up people and walk are gone afterwards. The
-- last result says "ALL CHECKS PASSED"; a failed check stops the run with "FAIL: ...".
--
-- Made-up people: Anna walks. Sam is her contact on this walk. Pat is her contact but paused. Eve
-- is a stranger.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000190001', 'authenticated', 'authenticated', 'anna.test19@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000190002', 'authenticated', 'authenticated', 'sam.test19@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000190003', 'authenticated', 'authenticated', 'pat.test19@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000190004', 'authenticated', 'authenticated', 'eve.test19@example.com', '{"age_confirmed":"true"}');

update public.profiles set display_name = 'Anna' where id = '00000000-0000-4000-8000-000000190001';

insert into public.contacts (id, user_id, contact_user_id, label, status, accepted_at) values
  ('00000000-0000-4000-8000-000000191002', '00000000-0000-4000-8000-000000190001',
   '00000000-0000-4000-8000-000000190002', 'Sam', 'accepted', now()),
  ('00000000-0000-4000-8000-000000191003', '00000000-0000-4000-8000-000000190001',
   '00000000-0000-4000-8000-000000190003', 'Pat', 'accepted', now());

insert into public.walks (id, user_id, destination_label, started_at, deadline) values
  ('00000000-0000-4000-8000-0000001d1901', '00000000-0000-4000-8000-000000190001',
   'Kruisstraat 10', now() - interval '5 minutes', now() + interval '20 minutes');

insert into public.walk_contacts (walk_id, contact_id) values
  ('00000000-0000-4000-8000-0000001d1901', '00000000-0000-4000-8000-000000191002'),
  ('00000000-0000-4000-8000-0000001d1901', '00000000-0000-4000-8000-000000191003');

update public.contacts set status = 'paused' where id = '00000000-0000-4000-8000-000000191003';

set local role authenticated;

-- ---------- Sam taps "I'm watching" ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000190002","role":"authenticated"}', true);

do $$ begin
  assert (select not you_are_watching
          from public.followed_walk('00000000-0000-4000-8000-0000001d1901')),
    'FAIL: Sam is shown as watching before tapping';
end $$;

select public.watch_walk('00000000-0000-4000-8000-0000001d1901');

do $$ begin
  assert (select you_are_watching and last_lat is null
          from public.followed_walk('00000000-0000-4000-8000-0000001d1901')),
    'FAIL: after tapping, Sam is not shown as watching, or sees a location';
end $$;

-- ---------- Anna sees that Sam is watching ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000190001","role":"authenticated"}', true);

do $$ begin
  assert (select count(*) from public.walk_contacts
          where walk_id = '00000000-0000-4000-8000-0000001d1901' and watching_at is not null) = 1,
    'FAIL: Anna does not see exactly one contact watching';
end $$;

-- ---------- A paused contact and a stranger cannot ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000190003","role":"authenticated"}', true);

do $$ begin
  perform public.watch_walk('00000000-0000-4000-8000-0000001d1901');
  raise exception 'FAIL: a paused contact could say they are watching';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000190004","role":"authenticated"}', true);

do $$ begin
  perform public.watch_walk('00000000-0000-4000-8000-0000001d1901');
  raise exception 'FAIL: a stranger could say they are watching';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- ---------- Nobody can set it directly ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000190002","role":"authenticated"}', true);

do $$ begin
  update public.walk_contacts set watching_at = now()
  where walk_id = '00000000-0000-4000-8000-0000001d1901';
  assert not found, 'FAIL: walk_contacts can be changed directly';
end $$;

-- ---------- An ended walk cannot be watched any more ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000190001","role":"authenticated"}', true);
select public.check_in('00000000-0000-4000-8000-0000001d1901');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000190002","role":"authenticated"}', true);

do $$ begin
  perform public.watch_walk('00000000-0000-4000-8000-0000001d1901');
  raise exception 'FAIL: a walk that ended could still be watched';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

reset role;
select 'ALL CHECKS PASSED' as result;

rollback;
