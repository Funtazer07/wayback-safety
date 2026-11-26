-- Test for supabase/migrations/0027_report_lifetimes.sql: how long each report category stays.
--
-- How to run: paste the whole file into the Supabase SQL Editor and click Run, after 0027 is run.
-- One transaction that ends with ROLLBACK, so the made-up person and reports are gone afterwards.
-- The last result says "ALL CHECKS PASSED"; a failed check stops the run with "FAIL: ...".
--
-- Made-up person: Anna reports one of each category around Stratumseind.

begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000270001', 'authenticated', 'authenticated', 'anna.test27@example.com', '{"age_confirmed":"true"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000270001","role":"authenticated"}', true);

select public.report_place('dark_area', 51.4385, 5.4791);
select public.report_place('unsafe', 51.4386, 5.4792);
select public.report_place('other', 51.4387, 5.4793);
select public.report_place('broken_light', 51.4388, 5.4794);
select * from public.report_broken_light('test-lamp-27', 51.4389, 5.4795, 'Stratumseind');

-- ---------- Each category gets its own lifetime ----------
do $$ begin
  assert (select bool_and(expires_at - created_at = interval '30 days')
          from public.reports where category = 'dark_area'),
    'FAIL: a dark area does not stay 30 days';
  assert (select bool_and(expires_at - created_at = interval '24 hours')
          from public.reports where category = 'unsafe'),
    'FAIL: an unsafe situation does not stay 24 hours';
  assert (select bool_and(expires_at - created_at = interval '7 days')
          from public.reports where category = 'other'),
    'FAIL: another hazard does not stay 7 days';
  assert (select count(*) = 2 and bool_and(expires_at - created_at = interval '14 days')
          from public.reports where category = 'broken_light'),
    'FAIL: a broken light, from the form or from a lamp, does not stay 14 days';
end $$;

-- ---------- Quiet, only when 0026_quiet_reports.sql is run ----------
do $$ begin
  if exists (select 1 from pg_proc where proname = 'quiet_reporting_available') then
    perform public.report_place('quiet', 51.4390, 5.4796);
    assert (select bool_and(expires_at - created_at = interval '7 days')
            from public.reports where category = 'quiet'),
      'FAIL: a quiet street does not stay 7 days';
  end if;
end $$;

-- ---------- The helper cannot be called by the app ----------
do $$ begin
  perform public.report_lifetime('unsafe');
  raise exception 'FAIL: the app can call report_lifetime directly';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- ---------- An expired report is hidden ----------
reset role;
update public.reports set created_at = now() - interval '2 days', expires_at = now() - interval '1 day'
where category = 'unsafe';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000270001","role":"authenticated"}', true);

do $$ begin
  assert (select count(*) = 0 from public.reports where category = 'unsafe'),
    'FAIL: an expired report is still shown';
end $$;

reset role;
select 'ALL CHECKS PASSED' as result;

rollback;
