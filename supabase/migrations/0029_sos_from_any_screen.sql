-- SOS from any signed-in screen. Reuse walk alerts and their existing location retention.
--
-- An SOS reaches every accepted contact. During a walk the contacts chosen for it stay on it and
-- the other accepted contacts are added, so a walk without contacts can still send SOS.
-- On a walk that is already overdue, sos_at and overdue_at both move to the moment SOS was
-- pressed (sos_at must equal overdue_at, 0027), so the push shows the right time.
-- Assumption: this restarts the 24-hour location window (0012), which fits, because the walker
-- just sent a fresh location.
create function public.send_emergency_sos(
  request_id uuid,
  lat double precision default null,
  lng double precision default null
)
returns public.walks
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  target public.walks;
begin
  if owner_id is null or request_id is null then
    raise exception 'A signed-in user and request id are required';
  end if;
  if (lat is null) <> (lng is null)
    or lat not between -90 and 90 or lng not between -180 and 180 then
    raise exception 'Invalid location';
  end if;

  -- Serialize retries and requests from other devices for this account.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 0));

  select * into target from public.walks where id = request_id and user_id = owner_id;
  if target.sos_at is not null then
    return target;
  end if;

  select * into target from public.walks
  where user_id = owner_id and (status = 'active' or (status = 'overdue' and overdue_at > now() - interval '24 hours'))
  order by started_at desc limit 1 for update;

  if target.sos_at is not null then
    return target;
  end if;

  if not exists (
    select 1 from public.contacts where user_id = owner_id and status = 'accepted'
  ) then
    raise exception 'Add an accepted trusted contact before sending SOS';
  end if;

  if target.id is null then
    -- Insert in the final state so there is a single SOS notification.
    insert into public.walks (
      id, user_id, destination_label, deadline, status, warned_at, overdue_at, sos_at,
      last_lat, last_lng, last_location_at
    ) values (
      request_id, owner_id, 'SOS', now() + interval '1 minute', 'overdue', now(), now(), now(),
      lat, lng, case when lat is not null then now() end
    ) returning * into target;

    insert into public.walk_contacts (walk_id, contact_id)
    select target.id, id from public.contacts where user_id = owner_id and status = 'accepted';

    perform public.queue_walk_push(target.id, 'sos');
  else
    -- The contacts already chosen for the walk stay on it.
    insert into public.walk_contacts (walk_id, contact_id)
    select target.id, id from public.contacts where user_id = owner_id and status = 'accepted'
    on conflict do nothing;

    if target.status = 'active' then
      target := public.send_sos(target.id, lat, lng);
    else
      update public.walks set overdue_at = now(), sos_at = now(),
        last_lat = coalesce(lat, last_lat), last_lng = coalesce(lng, last_lng),
        last_location_at = case when lat is null then last_location_at else now() end
      where id = target.id returning * into target;
      perform public.queue_walk_push(target.id, 'sos');
    end if;
  end if;
  return target;
end;
$$;

revoke execute on function public.send_emergency_sos(uuid, double precision, double precision)
  from public, anon;
grant execute on function public.send_emergency_sos(uuid, double precision, double precision)
  to authenticated;

-- The ordinary insert trigger must not send a "walk started" message for an emergency.
drop trigger walks_push_when_started on public.walks;
create trigger walks_push_when_started
  after insert on public.walks for each row
  when (new.sos_at is null)
  execute function public.send_walk_push();
