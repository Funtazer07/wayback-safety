-- SCRUM-96: the four report categories of the report form.
--
-- Decided on 4 Nov, different from the SCRUM-8 text in Jira ("no light, quiet/empty, sketchy/unsafe
-- feeling, other"). The form now offers:
-- - broken_light: a street light is broken, flickering or switched off.
-- - dark_area: a street, cycle path or footpath feels too dark because there is too little light.
-- - unsafe: harassment, intimidation or behaviour that makes the user feel unsafe.
-- - other: physical obstacles, blocked paths or anything else that may make a route unsafe.
--
-- "Quiet or empty" is no longer a category of its own. "No light" is split in two: one lamp that
-- does not work is something the municipality can fix; a dark area needs more lamps.

-- The old checks name the old values, so they go first. Postgres chose their names itself, so they
-- are found by what they check instead of by name.
do $$
declare
  old_check record;
begin
  for old_check in
    select conname from pg_constraint
    where conrelid = 'public.reports'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%no_light%'
  loop
    execute format('alter table public.reports drop constraint %I', old_check.conname);
  end loop;
end;
$$;

-- Existing reports move to the closest new category.
update public.reports set category = 'broken_light' where category = 'no_light' and lamp_id is not null;
update public.reports set category = 'dark_area' where category = 'no_light' and lamp_id is null;
-- Assumption: a place that felt quiet or empty was reported because it felt unsafe.
update public.reports set category = 'unsafe' where category = 'quiet';

alter table public.reports
  add constraint reports_category_check
    check (category in ('broken_light', 'dark_area', 'unsafe', 'other')),
  -- A lamp report is always about a broken light.
  add constraint reports_lamp_is_broken_light
    check (lamp_id is null or category = 'broken_light');

-- Same function as in 0008_reports.sql, with the new category name. "create or replace" keeps the
-- execute rights given there.
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
    now() + interval '30 days'
  )
  returning report.id, report.created_at;
exception
  when unique_violation then
    raise exception 'This light is already reported as broken';
end;
$$;
