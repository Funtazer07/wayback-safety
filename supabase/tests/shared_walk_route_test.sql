-- Test for the shared route in supabase/migrations/0023_shared_walk_route.sql.
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0023 is run.
-- Everything happens in one transaction that ends with ROLLBACK, so the made-up users, contact and
-- walk are gone afterwards. The last result says "ALL CHECKS PASSED"; a failed check stops the run
-- with "FAIL: ...".
--
-- Anna walks home from Stratumseind; Mum is her contact. Ben is someone else.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000c0a01', 'authenticated', 'authenticated',
   'anna.route@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-0000000c0a02', 'authenticated', 'authenticated',
   'mum.route@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-0000000c0a03', 'authenticated', 'authenticated',
   'ben.route@example.com', '{"age_confirmed":"true"}');

update public.profiles set display_name = 'Anna' where id = '00000000-0000-4000-8000-0000000c0a01';

insert into public.contacts (id, user_id, contact_user_id, label, status, accepted_at) values
  ('00000000-0000-4000-8000-0000000c0c01', '00000000-0000-4000-8000-0000000c0a01',
   '00000000-0000-4000-8000-0000000c0a02', 'Mum', 'accepted', now());

insert into public.walks (id, user_id, destination_label, started_at, deadline) values
  ('00000000-0000-4000-8000-0000000c0e01', '00000000-0000-4000-8000-0000000c0a01', 'Home',
   now() - interval '5 minutes', now() + interval '15 minutes');

insert into public.walk_contacts (walk_id, contact_id) values
  ('00000000-0000-4000-8000-0000000c0e01', '00000000-0000-4000-8000-0000000c0c01');

-- ---------- Anna shares her route ----------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000c0a01","role":"authenticated"}', true);

select public.share_walk_route('00000000-0000-4000-8000-0000000c0e01',
  '[[5.4791, 51.4385], [5.4801, 51.4390], [5.4820, 51.4402]]');

-- A wrong route is refused with a clear message.
do $$ begin
  perform public.share_walk_route('00000000-0000-4000-8000-0000000c0e01', '[[5.4791, 51.4385]]');
  raise exception 'FAIL: a route of one point was accepted';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

do $$ begin
  perform public.share_walk_route('00000000-0000-4000-8000-0000000c0e01',
    '[[5.4791, 51.4385], ["x", 51.4390]]');
  raise exception 'FAIL: a point that is not two numbers was accepted';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

do $$ begin
  perform public.share_walk_route('00000000-0000-4000-8000-0000000c0e01',
    '[[5.4791, 51.4385], [5.4801, 951.4390]]');
  raise exception 'FAIL: a point off the earth was accepted';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- ---------- Mum sees the route while the walk is on the way ----------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000c0a02","role":"authenticated"}', true);

do $$ begin
  assert (select jsonb_array_length(route)
          from public.followed_walk('00000000-0000-4000-8000-0000000c0e01')) = 3,
    'FAIL: the contact does not see the route of a walk on the way';
end $$;

-- Mum cannot put a route on Anna's walk.
do $$ begin
  perform public.share_walk_route('00000000-0000-4000-8000-0000000c0e01',
    '[[5.4791, 51.4385], [5.4801, 51.4390]]');
  raise exception 'FAIL: a contact changed the walker''s route';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- ---------- Ben, who is not her contact, sees nothing ----------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000c0a03","role":"authenticated"}', true);

do $$ begin
  perform public.followed_walk('00000000-0000-4000-8000-0000000c0e01');
  raise exception 'FAIL: someone who is not a contact could open the walk';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

reset role;

-- ---------- The route is erased as soon as the walk is no longer on the way ----------
update public.walks set status = 'overdue', warned_at = now(), overdue_at = now()
where id = '00000000-0000-4000-8000-0000000c0e01';

do $$ begin
  assert (select route is null from public.walks
          where id = '00000000-0000-4000-8000-0000000c0e01'),
    'FAIL: an overdue walk kept its route';
end $$;

-- Back to active by hand, to check the check-in too.
update public.walks set status = 'active', warned_at = null, overdue_at = null,
  route = '[[5.4791, 51.4385], [5.4801, 51.4390]]'
where id = '00000000-0000-4000-8000-0000000c0e01';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000c0a01","role":"authenticated"}', true);
select public.check_in('00000000-0000-4000-8000-0000000c0e01');
reset role;

do $$ begin
  assert (select route is null from public.walks
          where id = '00000000-0000-4000-8000-0000000c0e01'),
    'FAIL: a checked-in walk kept its route';
end $$;

-- An ended walk cannot get a route back.
set local role authenticated;
do $$ begin
  perform public.share_walk_route('00000000-0000-4000-8000-0000000c0e01',
    '[[5.4791, 51.4385], [5.4801, 51.4390]]');
  raise exception 'FAIL: an ended walk got a route';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;
reset role;

select 'ALL CHECKS PASSED' as result;

rollback;
