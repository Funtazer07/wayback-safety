-- Reports no longer store who made them. Until now the reports table kept user_id, hidden from the
-- app, to limit how many reports one person makes and to delete them with the account. Now a
-- report cannot be traced back to its reporter at all, not even by the team in the dashboard.
--
-- The daily limit moves to a separate counter that knows how many reports someone made today, but
-- not which ones. A report is not deleted with the account any more; it expires by itself
-- (at most 30 days, see 0027_report_lifetimes.sql).
--
-- Run after 0027_report_lifetimes.sql: the report functions below use report_lifetime.

begin;

create table public.report_counts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  reports int not null check (reports > 0),
  primary key (user_id, day)
);

-- Only prepare_report uses it. Row level security with no policy: the app cannot read or change it.
alter table public.report_counts enable row level security;
revoke all on public.report_counts from anon, authenticated;

create or replace function public.prepare_report()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  made_today int;
begin
  if (select auth.uid()) is null then
    raise exception 'Not logged in';
  end if;

  delete from public.reports where expires_at <= now();
  -- Only today's count is needed.
  delete from public.report_counts where day < current_date;

  insert into public.report_counts (user_id, day, reports)
  values ((select auth.uid()), current_date, 1)
  on conflict (user_id, day) do update set reports = report_counts.reports + 1
  returning reports into made_today;

  -- Assumption: 20 reports a day is more than anyone needs on their way home, and stops one person
  -- from filling the map. Counted per calendar day (UTC). A report that fails is not counted,
  -- because the whole call is undone.
  if made_today > 20 then
    raise exception 'You can make at most 20 reports a day';
  end if;
end;
$$;

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

  insert into public.reports (category, lat, lng, note, expires_at)
  values (
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
  insert into public.reports as report (category, lat, lng, lamp_id, street, expires_at)
  values (
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

-- Last, so the functions above never write the column again. Existing reports lose their reporter.
alter table public.reports drop column user_id;

commit;
