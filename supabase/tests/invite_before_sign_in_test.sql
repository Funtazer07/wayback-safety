-- Test for supabase/migrations/0024_invite_before_sign_in.sql: someone who is not signed in yet can
-- see who sent a valid invite link, and nothing more.
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0024 is run.
-- One transaction that ends with ROLLBACK, so the made-up person is gone afterwards. The last
-- result says "ALL CHECKS PASSED"; a failed check stops the run with "FAIL: ...".
--
-- Made-up person: Anna invites someone who has no account yet.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000f0001', 'authenticated', 'authenticated',
   'anna.test24@example.com', '{"age_confirmed":"true"}');

update public.profiles set display_name = 'Anna' where id = '00000000-0000-4000-8000-0000000f0001';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000f0001","role":"authenticated"}', true);
select set_config('test.token', token, true) from public.create_invite('Mum');

-- ---------- Not signed in: the inviter's name for a valid link ----------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$ begin
  assert (select inviter_name from public.get_invite(current_setting('test.token'))) = 'Anna',
    'FAIL: a signed-out visitor does not see who sent the invite';
end $$;

-- ---------- A wrong link still says nothing ----------
do $$ begin
  perform public.get_invite('not-a-real-token');
  raise exception 'FAIL: a wrong link was answered';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- ---------- Accepting still needs an account ----------
do $$ begin
  perform public.accept_invite(current_setting('test.token'));
  raise exception 'FAIL: a signed-out visitor accepted an invite';
exception when insufficient_privilege then null;
end $$;

reset role;

select 'ALL CHECKS PASSED' as result;

rollback;
