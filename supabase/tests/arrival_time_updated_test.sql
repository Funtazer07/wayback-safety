-- Test for the "arrival time updated" message in supabase/migrations/0022_arrival_time_updated.sql
-- (SCRUM-107).
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0022 is run.
-- Everything happens in one transaction that ends with ROLLBACK. Inside it, queue_walk_push is
-- replaced by a version that only writes down what would be sent, so no real push goes out. The
-- last result says "ALL CHECKS PASSED"; a failed check stops the run with "FAIL: ...".

begin;

create temporary table queued_pushes (walk_id uuid, walk_event text);

create or replace function public.queue_walk_push(walk_id uuid, walk_event text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into pg_temp.queued_pushes values (walk_id, walk_event);
end;
$$;

-- One made-up walker, Anna.
insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000e107', 'authenticated', 'authenticated',
   'anna.extend107@example.com', '{"age_confirmed":"true"}');

insert into public.walks (id, user_id, destination_label, started_at, deadline)
values ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-00000000e107', 'Home',
        now() - interval '10 minutes', now() + interval '10 minutes');

-- ---------- Starting a walk is not an extension ----------
do $$ begin
  assert not exists (select 1 from pg_temp.queued_pushes where walk_event = 'deadline_extended'),
    'FAIL: starting a walk sent "arrival time updated"';
end $$;

-- ---------- Each tap on +5 sends exactly one message ----------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000e107","role":"authenticated"}', true);

select public.extend_walk('00000000-0000-4000-8000-000000000107', 5);

reset role;

do $$ begin
  assert (select count(*) from pg_temp.queued_pushes
          where walk_id = '00000000-0000-4000-8000-000000000107'
            and walk_event = 'deadline_extended') = 1,
    'FAIL: one extension did not send exactly one message';
end $$;

set local role authenticated;
select public.extend_walk('00000000-0000-4000-8000-000000000107', 10);
reset role;

do $$ begin
  assert (select count(*) from pg_temp.queued_pushes
          where walk_event = 'deadline_extended') = 2,
    'FAIL: a second extension did not send its own message';
end $$;

-- ---------- Other changes to the walk send nothing new ----------
-- The reminder job and the late-walk check change other columns, never the deadline.
update public.walks set reminder_deadline = deadline, warned_at = now()
where id = '00000000-0000-4000-8000-000000000107';

-- An earlier deadline is not "more time" (only a hand edit can do this).
update public.walks set deadline = deadline - interval '1 minute'
where id = '00000000-0000-4000-8000-000000000107';

-- A walk that is no longer active.
update public.walks set status = 'safe', checked_in_at = now()
where id = '00000000-0000-4000-8000-000000000107';
update public.walks set deadline = deadline + interval '5 minutes'
where id = '00000000-0000-4000-8000-000000000107';

do $$ begin
  assert (select count(*) from pg_temp.queued_pushes
          where walk_event = 'deadline_extended') = 2,
    'FAIL: a change that is not an extension sent "arrival time updated"';
end $$;

-- ---------- The app cannot send it by hand ----------
set local role authenticated;
do $$ begin
  assert not has_function_privilege('public.send_walk_extended_push()', 'execute'),
    'FAIL: a logged-in user may run send_walk_extended_push';
end $$;
reset role;

select 'ALL CHECKS PASSED' as result;

rollback;
