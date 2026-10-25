-- Test for the late-walk rules in supabase/migrations/0011_late_walks.sql (SCRUM-73).
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0011 is run.
-- Everything happens in one transaction that ends with ROLLBACK, so the made-up user and walk are
-- gone afterwards, and no push message is really sent (the queued web requests are rolled back
-- too). The last result says "ALL CHECKS PASSED"; a failed check stops the run with "FAIL: ...".
--
-- One made-up walker, Anna. The test moves her walk's times around by hand and calls
-- check_late_walks() after each change, as the every-minute job would. Within one transaction
-- now() stays the same moment, so times are set relative to it.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000e001', 'authenticated', 'authenticated',
   'anna.test11@example.com', '{"age_confirmed":"true"}');

insert into public.walks (id, user_id, destination_label, started_at, deadline)
values ('00000000-0000-4000-8000-0000000e0a1f', '00000000-0000-4000-8000-00000000e001', 'Home',
        now() - interval '30 minutes', now() + interval '10 minutes');

-- ---------- Before the deadline nothing happens ----------
select public.check_late_walks();

do $$ begin
  assert (select warned_at is null and status = 'active' from public.walks
          where id = '00000000-0000-4000-8000-0000000e0a1f'),
    'FAIL: a walk was warned before its deadline';
end $$;

-- ---------- Deadline passed: warned, still active ----------
update public.walks set deadline = now() - interval '1 minute'
where id = '00000000-0000-4000-8000-0000000e0a1f';

select public.check_late_walks();

do $$ begin
  assert (select warned_at = now() and status = 'active' from public.walks
          where id = '00000000-0000-4000-8000-0000000e0a1f'),
    'FAIL: a late walk was not warned, or became overdue straight away';
end $$;

-- ---------- Warned once per deadline ----------
-- Pretend the warning went out a minute ago, then run the check again: it must not warn again.
update public.walks set warned_at = now() - interval '30 seconds'
where id = '00000000-0000-4000-8000-0000000e0a1f';

select public.check_late_walks();

do $$ begin
  assert (select warned_at = now() - interval '30 seconds' from public.walks
          where id = '00000000-0000-4000-8000-0000000e0a1f'),
    'FAIL: the same deadline was warned twice';
end $$;

-- ---------- During the grace period: still active ----------
update public.walks set deadline = now() - interval '10 minutes', warned_at = now() - interval '4 minutes'
where id = '00000000-0000-4000-8000-0000000e0a1f';

select public.check_late_walks();

do $$ begin
  assert (select status = 'active' from public.walks
          where id = '00000000-0000-4000-8000-0000000e0a1f'),
    'FAIL: the walk became overdue before the 5 minutes after the warning were over';
end $$;

-- ---------- Extended during the grace period: not overdue, not warned again yet ----------
update public.walks set warned_at = now() - interval '10 minutes', deadline = now() + interval '5 minutes'
where id = '00000000-0000-4000-8000-0000000e0a1f';

select public.check_late_walks();

do $$ begin
  assert (select status = 'active' and warned_at = now() - interval '10 minutes' from public.walks
          where id = '00000000-0000-4000-8000-0000000e0a1f'),
    'FAIL: an extended walk became overdue on the old warning, or was warned before the new deadline';
end $$;

-- ---------- The new deadline passes too: warned again ----------
update public.walks set deadline = now() - interval '1 minute'
where id = '00000000-0000-4000-8000-0000000e0a1f';

select public.check_late_walks();

do $$ begin
  assert (select warned_at = now() and status = 'active' from public.walks
          where id = '00000000-0000-4000-8000-0000000e0a1f'),
    'FAIL: an extended walk was not warned when its new deadline passed';
end $$;

-- ---------- Grace period over: overdue ----------
update public.walks set deadline = now() - interval '10 minutes', warned_at = now() - interval '5 minutes'
where id = '00000000-0000-4000-8000-0000000e0a1f';

select public.check_late_walks();

do $$ begin
  assert (select status = 'overdue' and overdue_at = now() from public.walks
          where id = '00000000-0000-4000-8000-0000000e0a1f'),
    'FAIL: the walk did not become overdue 5 minutes after the warning';
end $$;

-- ---------- Overdue only once ----------
update public.walks set overdue_at = now() - interval '1 minute'
where id = '00000000-0000-4000-8000-0000000e0a1f';

select public.check_late_walks();

do $$ begin
  assert (select overdue_at = now() - interval '1 minute' from public.walks
          where id = '00000000-0000-4000-8000-0000000e0a1f'),
    'FAIL: an overdue walk was handled a second time';
end $$;

-- ---------- A checked-in walk is left alone ----------
update public.walks
set status = 'safe', checked_in_at = now(), deadline = now() - interval '20 minutes',
    warned_at = null, overdue_at = null
where id = '00000000-0000-4000-8000-0000000e0a1f';

select public.check_late_walks();

do $$ begin
  assert (select status = 'safe' and warned_at is null from public.walks
          where id = '00000000-0000-4000-8000-0000000e0a1f'),
    'FAIL: a walk that was checked in got warned';
end $$;

-- ---------- The database refuses an overdue walk without a warning ----------
do $$ begin
  update public.walks
  set status = 'overdue', checked_in_at = null, overdue_at = now(), warned_at = null
  where id = '00000000-0000-4000-8000-0000000e0a1f';
  raise exception 'FAIL: a walk became overdue without a warning';
exception when check_violation then null;
end $$;

-- ---------- The app cannot run the check itself ----------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000e001","role":"authenticated"}', true);

do $$ begin
  perform public.check_late_walks();
  raise exception 'FAIL: a logged-in user could run the late-walk check';
exception when insufficient_privilege then null;
end $$;

reset role;

-- ---------- The job is scheduled ----------
do $$ begin
  assert (select count(*) from cron.job where jobname = 'check-late-walks' and schedule = '* * * * *') = 1,
    'FAIL: the every-minute job check-late-walks is missing';
end $$;

select 'ALL CHECKS PASSED' as result;

rollback;
