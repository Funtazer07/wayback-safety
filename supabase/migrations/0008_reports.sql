-- SCRUM-92: the reports table.
--
-- Two kinds of report live here (decided on 22 Oct):
-- - A place report (SCRUM-8, form in SCRUM-96): a category, a spot near where the user was, and
--   an optional short note.
-- - A broken street light (SCRUM-99, the map): one lamp from the municipal register, at the
--   lamp's own spot. Until now these were kept on the phone only.
--
-- Also decided on 22 Oct, different from the SCRUM-92 text in Jira: every signed-in user can see
-- reports, so the map can show them. What stays hidden from other users:
-- - who reported it. The user_id column is only there so a user's reports are deleted with their
--   account, and so the app can limit how many reports one person makes.
-- - where the reporter was. A place report is stored at a rounded spot, never the GPS position.
--   A broken-light report is stored at the lamp, which is public register data.
-- - the note, until reports can be flagged (SCRUM-32). A note could name or describe someone.
--
-- No link to a walk, a route or a location history. No photos.
--
-- Rounding and how long reports are kept should come from SCRUM-90 (research, not finished yet).
-- Until then the values below are assumptions; a new migration changes them.

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- no_light: a dark spot or a broken lamp. quiet: quiet or empty. unsafe: a sketchy or unsafe
  -- feeling. other: anything else. The four from SCRUM-8.
  category text not null check (category in ('no_light', 'quiet', 'unsafe', 'other')),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  -- Only for a broken street light: the lamp's number in the register and its street.
  lamp_id text check (char_length(lamp_id) between 1 and 40),
  street text check (char_length(street) <= 120),
  -- Optional, short, and not shown to other users yet (see above).
  note text check (char_length(btrim(note)) between 1 and 140),
  created_at timestamptz not null default now(),
  -- After this a report is not shown any more, and the next new report deletes it.
  expires_at timestamptz not null,
  -- A lamp report is always about a light.
  check (lamp_id is null or category = 'no_light'),
  check (street is null or lamp_id is not null),
  check (expires_at > created_at)
);

-- One report per lamp at a time: a light that is already reported cannot be reported again.
create unique index reports_one_per_lamp on public.reports (lamp_id) where lamp_id is not null;

-- Row level security, same pattern as 0001_profiles.sql.
alter table public.reports enable row level security;

create policy "Signed-in users can read reports that have not expired"
  on public.reports for select
  to authenticated
  using (expires_at > now());

-- Row level security picks rows, not columns. Column rights hide who reported and the note from
-- everyone: the app can only ask for the columns listed here.
revoke all on public.reports from anon, authenticated;
grant select (id, category, lat, lng, lamp_id, street, created_at, expires_at)
  on public.reports to authenticated;

-- No insert, update or delete policy on purpose. The app calls the functions below, so the spot is
-- always rounded and the expiry always set by the server.

-- Deletes expired reports and checks the daily limit. Shared by the two report functions.
create function public.prepare_report()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  -- Assumption: a report is kept 30 days (see the reporting functions). Old ones are deleted here,
  -- so nothing is kept longer than needed without a separate cleaning job.
  delete from public.reports where expires_at <= now();

  -- Assumption: 20 reports a day is more than anyone needs on their way home, and stops one person
  -- from filling the map.
  if (
    select count(*) from public.reports
    where user_id = (select auth.uid()) and created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'You can make at most 20 reports a day';
  end if;
end;
$$;

-- A place report (SCRUM-96). lat and lng are where the user is; the server rounds them before
-- saving, so the exact spot is never stored, even if the app forgets to round.
create function public.report_place(
  category text,
  lat double precision,
  lng double precision,
  note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform public.prepare_report();

  insert into public.reports (user_id, category, lat, lng, note, expires_at)
  values (
    (select auth.uid()),
    report_place.category,
    -- Assumption: 3 decimals is about 110 m north-south and 70 m east-west in Eindhoven. Close
    -- enough to find the spot, too rough to point at one front door. SCRUM-90 decides for real.
    round(report_place.lat::numeric, 3),
    round(report_place.lng::numeric, 3),
    nullif(btrim(report_place.note), ''),
    now() + interval '30 days'
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- A broken street light (the map). Stored at the lamp's own spot from the register.
create function public.report_broken_light(
  lamp_id text,
  lat double precision,
  lng double precision,
  street text
)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.prepare_report();

  return query
  insert into public.reports as report (user_id, category, lat, lng, lamp_id, street, expires_at)
  values (
    (select auth.uid()),
    'no_light',
    report_broken_light.lat,
    report_broken_light.lng,
    report_broken_light.lamp_id,
    nullif(btrim(report_broken_light.street), ''),
    now() + interval '30 days'
  )
  returning report.id, report.created_at;
exception
  when unique_violation then
    raise exception 'This light is already reported as broken';
end;
$$;

-- "It works again": removes the report of this lamp. Any signed-in user may do this, like on the
-- map today. Decided on 22 Oct; SCRUM-18 ("still there" / "gone" answers) can make it fairer.
create function public.mark_light_working(lamp_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  delete from public.reports where reports.lamp_id = mark_light_working.lamp_id;
end;
$$;

-- prepare_report is only a helper: nobody calls it directly.
revoke execute on function public.prepare_report() from public, anon, authenticated;

-- Only logged-in users may call the others.
revoke execute on function public.report_place(text, double precision, double precision, text)
  from public, anon;
revoke execute on function public.report_broken_light(text, double precision, double precision, text)
  from public, anon;
revoke execute on function public.mark_light_working(text) from public, anon;
grant execute on function public.report_place(text, double precision, double precision, text)
  to authenticated;
grant execute on function public.report_broken_light(text, double precision, double precision, text)
  to authenticated;
grant execute on function public.mark_light_working(text) to authenticated;
