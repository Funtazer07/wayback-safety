-- Test for 0028_anonymous_reports.sql: a report never stores or shows who made it. Others see only
-- the category, the place and the time.
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0027 and 0028
-- are run. One transaction that ends with ROLLBACK, so the made-up people and reports are gone
-- afterwards. The last result says "ALL CHECKS PASSED"; a failed check stops the run with "FAIL: ...".
--
-- Made-up people: Anna reports a dark street with a note. Sam is another user who sees the map.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000440001', 'authenticated', 'authenticated', 'anna.test44@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000440002', 'authenticated', 'authenticated', 'sam.test44@example.com', '{"age_confirmed":"true"}');

-- ---------- The table has no column for the reporter ----------
do $$ begin
  assert not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'user_id'
  ), 'FAIL: reports still has a user_id column';
end $$;

set local role authenticated;

-- ---------- Anna reports, and gets back only the id of the report ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000440001","role":"authenticated"}', true);

do $$ begin
  assert (select pg_typeof(public.report_place('dark_area', 51.438527, 5.479134, 'Near the bike shed'))
          = 'uuid'::regtype),
    'FAIL: report_place returns more than an id';
end $$;

-- ---------- Sam sees the category, the rounded place and the time, not the note ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000440002","role":"authenticated"}', true);

do $$ begin
  -- created_at = now() picks the report made in this test, not real reports in the database.
  assert (select count(*) = 1 and bool_and(category = 'dark_area' and lat = 51.439 and lng = 5.479)
          from public.reports where created_at = now()),
    'FAIL: Sam does not see the report at its rounded place';
end $$;

do $$ begin
  perform note from public.reports;
  raise exception 'FAIL: another user can read the note of a report';
exception when insufficient_privilege then null;
end $$;

-- ---------- The daily counter cannot be read, and does not say which reports ----------
do $$ begin
  perform 1 from public.report_counts;
  raise exception 'FAIL: the app can read who made how many reports';
exception when insufficient_privilege then null;
end $$;

reset role;
do $$ begin
  assert (select count(*) = 4 from information_schema.columns
          where table_schema = 'public' and table_name = 'report_counts'),
    'FAIL: report_counts has more than user, day, count';
end $$;

-- ---------- The limit of 20 a day still works ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000440001","role":"authenticated"}', true);

do $$ begin
  -- Anna made 1 report above; 19 more is exactly the limit.
  for i in 1..19 loop
    perform public.report_place('other', 51.44, 5.47);
  end loop;
  perform public.report_place('other', 51.44, 5.47);
  raise exception 'FAIL: a 21st report on one day was saved';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  assert sqlerrm = 'You can make at most 20 reports a day', 'FAIL: wrong error: ' || sqlerrm;
end $$;

-- ---------- Nobody signed out sees reports at all ----------
reset role;
set local role anon;

do $$ begin
  perform id from public.reports;
  raise exception 'FAIL: someone who is not signed in can read reports';
exception when insufficient_privilege then null;
end $$;

reset role;
select 'ALL CHECKS PASSED' as result;

rollback;
