-- How long a report stays depends on its category: as long as the problem usually lasts. Before
-- this, every report stayed 30 days, so a situation that was over the same night still warned
-- people for a month. Shorter is also better for privacy: a report is kept no longer than it helps.
--
-- Expired reports are already hidden by the read policy of 0008_reports.sql and deleted by the next
-- new report. This only changes when a report expires.

begin;

create function public.report_lifetime(category text)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case report_lifetime.category
    -- Assumption: the BuitenBeter open data shows reported lamps fixed within one to two weeks.
    -- "It works again" removes the report earlier.
    when 'broken_light' then interval '14 days'
    -- A dark street does not get lighter by itself. 30 days is the longest any report is kept.
    when 'dark_area' then interval '30 days'
    -- Assumption: a situation with people is usually over the same night. A day keeps it on the
    -- map for the people walking home after the reporter.
    when 'unsafe' then interval '24 hours'
    -- Assumption: how busy a street is changes with the week; a week covers the same night once.
    when 'quiet' then interval '7 days'
    -- Assumption: an obstacle or blocked path is usually gone within a week.
    when 'other' then interval '7 days'
  end;
$$;

-- Only the report functions below use it.
revoke execute on function public.report_lifetime(text) from public, anon, authenticated;

-- Same as in 0008_reports.sql, with the lifetime of the category. "create or replace" keeps the
-- execute rights given there.
create or replace function public.report_place(
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
    round(report_place.lat::numeric, 3),
    round(report_place.lng::numeric, 3),
    nullif(btrim(report_place.note), ''),
    now() + public.report_lifetime(report_place.category)
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- Same as in 0025_report_categories.sql, with the lifetime of a broken light.
create or replace function public.report_broken_light(
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
    'broken_light',
    report_broken_light.lat,
    report_broken_light.lng,
    report_broken_light.lamp_id,
    nullif(btrim(report_broken_light.street), ''),
    now() + public.report_lifetime('broken_light')
  )
  returning report.id, report.created_at;
exception
  when unique_violation then
    raise exception 'This light is already reported as broken';
end;
$$;

-- Reports made before this migration get the new lifetime too, counted from when they were made.
-- Never longer than they already had.
update public.reports
set expires_at = least(expires_at, created_at + public.report_lifetime(category));

delete from public.reports where expires_at <= now();

commit;
