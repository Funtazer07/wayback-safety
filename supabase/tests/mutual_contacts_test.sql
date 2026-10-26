-- Test for supabase/migrations/0014_mutual_contacts.sql (SCRUM-60): accepting an invite links both
-- ways.
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0014 is run.
-- One transaction that ends with ROLLBACK, so the made-up people are gone afterwards. The last
-- result says "ALL CHECKS PASSED"; a failed check stops the run with "FAIL: ...".
--
-- Made-up people: Anna invites. Sam accepts. Pat had already paused Anna before accepting.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000b0001', 'authenticated', 'authenticated', 'anna.test14@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-0000000b0002', 'authenticated', 'authenticated', 'sam.test14@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-0000000b0003', 'authenticated', 'authenticated', 'pat.test14@example.com', '{"age_confirmed":"true"}');

update public.profiles set display_name = 'Anna' where id = '00000000-0000-4000-8000-0000000b0001';

-- Pat already looks out for nobody, but has Anna on the list, paused.
insert into public.contacts (user_id, contact_user_id, label, status, accepted_at) values
  ('00000000-0000-4000-8000-0000000b0003', '00000000-0000-4000-8000-0000000b0001', 'My sister',
   'paused', now());

set local role authenticated;

-- ---------- Anna invites Sam and Pat ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000b0001","role":"authenticated"}', true);
select set_config('test.sam_token', token, true) from public.create_invite('Sam');
select set_config('test.pat_token', token, true) from public.create_invite('Pat');

-- ---------- Sam accepts: both directions ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000b0002","role":"authenticated"}', true);
select public.accept_invite(current_setting('test.sam_token'));

do $$ begin
  assert (select count(*) from public.contacts
          where user_id = '00000000-0000-4000-8000-0000000b0002'
            and contact_user_id = '00000000-0000-4000-8000-0000000b0001'
            and status = 'accepted' and label = 'Anna') = 1,
    'FAIL: after accepting, Sam does not have Anna as an accepted contact named "Anna"';
end $$;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000b0001","role":"authenticated"}', true);

do $$ begin
  assert (select status = 'accepted' from public.contacts
          where user_id = '00000000-0000-4000-8000-0000000b0001'
            and contact_user_id = '00000000-0000-4000-8000-0000000b0002'),
    'FAIL: Anna does not have Sam as an accepted contact';
end $$;

-- ---------- Pat accepts: the paused link back stays as it was ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000b0003","role":"authenticated"}', true);
select public.accept_invite(current_setting('test.pat_token'));

do $$ begin
  assert (select count(*) from public.contacts
          where user_id = '00000000-0000-4000-8000-0000000b0003'
            and contact_user_id = '00000000-0000-4000-8000-0000000b0001') = 1,
    'FAIL: Pat got a second link to Anna';
  assert (select status = 'paused' and label = 'My sister' from public.contacts
          where user_id = '00000000-0000-4000-8000-0000000b0003'
            and contact_user_id = '00000000-0000-4000-8000-0000000b0001'),
    'FAIL: Pat''s paused link to Anna was changed';
end $$;

-- ---------- Removing one direction keeps the other ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000b0002","role":"authenticated"}', true);
delete from public.contacts
where user_id = '00000000-0000-4000-8000-0000000b0002'
  and contact_user_id = '00000000-0000-4000-8000-0000000b0001';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000b0001","role":"authenticated"}', true);

do $$ begin
  assert (select count(*) from public.contacts
          where user_id = '00000000-0000-4000-8000-0000000b0001'
            and contact_user_id = '00000000-0000-4000-8000-0000000b0002') = 1,
    'FAIL: Sam removing Anna also removed Anna''s link to Sam';
end $$;

reset role;
select 'ALL CHECKS PASSED' as result;

rollback;
