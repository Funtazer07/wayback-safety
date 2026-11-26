-- Run after 0029 in a configured test database. The transaction rolls back queued pushes too.
begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000300001', 'authenticated', 'authenticated', 'sos30@example.com', '{"age_confirmed":"true"}'),
  ('00000000-0000-4000-8000-000000300002', 'authenticated', 'authenticated', 'contact30@example.com', '{"age_confirmed":"true"}');

insert into public.contacts (id, user_id, contact_user_id, label, status, accepted_at) values
  ('00000000-0000-4000-8000-00000030c001', '00000000-0000-4000-8000-000000300001',
   '00000000-0000-4000-8000-000000300002', 'Sam', 'accepted', now());

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000300001"}', true);
set local role authenticated;

-- A walk started without contacts still reaches the accepted contacts.
do $$
declare
  walking public.walks;
  sent public.walks;
begin
  walking := public.start_walk('Home', 15, null, null, '{}');
  sent := public.send_emergency_sos('00000000-0000-4000-8000-00000030e001', null, null);
  if sent.id <> walking.id or sent.sos_at is null then
    raise exception 'FAIL: SOS on a walk without contacts was not sent';
  end if;
  perform public.check_in(walking.id);
end;
$$;

reset role;
do $$
begin
  if not exists (
    select 1 from public.walk_contacts
    where contact_id = '00000000-0000-4000-8000-00000030c001'
  ) then
    raise exception 'FAIL: the accepted contact was not added to the walk';
  end if;
end;
$$;

-- SOS on a walk that is already overdue saves the time SOS was pressed.
insert into public.walks (id, user_id, destination_label, started_at, deadline, status, warned_at,
  overdue_at)
values ('00000000-0000-4000-8000-00000030a001', '00000000-0000-4000-8000-000000300001', 'Home',
  now() - interval '1 hour', now() - interval '40 minutes', 'overdue',
  now() - interval '40 minutes', now() - interval '35 minutes');

set local role authenticated;
do $$
declare
  sent public.walks;
begin
  sent := public.send_emergency_sos('00000000-0000-4000-8000-00000030e002', null, null);
  if sent.id <> '00000000-0000-4000-8000-00000030a001' or sent.sos_at <> now() then
    raise exception 'FAIL: SOS on an overdue walk kept the old time, %', sent.sos_at;
  end if;
end;
$$;

rollback;
select 'ALL CHECKS PASSED';
