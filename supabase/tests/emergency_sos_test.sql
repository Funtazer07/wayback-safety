-- Run after 0029 in a configured test database. The transaction rolls back queued pushes too.
begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000290001', 'authenticated', 'authenticated', 'sos29@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000290002', 'authenticated', 'authenticated', 'contact29a@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000290003', 'authenticated', 'authenticated', 'contact29b@example.com', '{"age_confirmed":"true"}');

insert into public.contacts (id, user_id, contact_user_id, label, status, accepted_at) values
  ('00000000-0000-4000-8000-00000029c001', '00000000-0000-4000-8000-000000290001',
   '00000000-0000-4000-8000-000000290002', 'Sam', 'accepted', now()),
  ('00000000-0000-4000-8000-00000029c002', '00000000-0000-4000-8000-000000290001',
   '00000000-0000-4000-8000-000000290003', 'Alex', 'accepted', now());

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000290001"}', true);
set local role authenticated;

do $$
declare
  emergency public.walks;
  repeated public.walks;
  walking public.walks;
begin
  emergency := public.send_emergency_sos('00000000-0000-4000-8000-00000029e001', 51.4385, 5.4791);
  if emergency.sos_at is null or emergency.status <> 'overdue' then
    raise exception 'FAIL: emergency was not saved';
  end if;

  repeated := public.send_emergency_sos('00000000-0000-4000-8000-00000029e001', null, null);
  if repeated.id <> emergency.id then
    raise exception 'FAIL: retry created another alert';
  end if;

  perform public.check_in(emergency.id);
  walking := public.start_walk('Home', 15, null, null, array['00000000-0000-4000-8000-00000029c001'::uuid]);
  repeated := public.send_emergency_sos('00000000-0000-4000-8000-00000029e002', null, null);
  if repeated.id <> walking.id then
    raise exception 'FAIL: SOS did not reuse the running walk';
  end if;
end;
$$;

reset role;
do $$
declare
  emergency_count integer;
  walk_count integer;
begin
  select count(*) into emergency_count from public.walk_contacts
    where walk_id = '00000000-0000-4000-8000-00000029e001';
  select count(*) into walk_count from public.walk_contacts wc
    join public.walks w on w.id = wc.walk_id
    where w.user_id = '00000000-0000-4000-8000-000000290001' and w.status = 'overdue';
  if emergency_count <> 2 or walk_count <> 1 then
    raise exception 'FAIL: wrong recipients, emergency %, walk %', emergency_count, walk_count;
  end if;
end;
$$;

rollback;
select 'ALL CHECKS PASSED';
