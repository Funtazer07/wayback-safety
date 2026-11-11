-- Adds quiet/empty reports without rewriting previous reports or changing their privacy rules.
begin;

alter table public.reports
  drop constraint reports_category_check,
  add constraint reports_category_check
    check (category in ('broken_light', 'dark_area', 'quiet', 'unsafe', 'other'));

-- The app enables Quiet only when the server confirms this migration is installed.
create function public.quiet_reporting_available()
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$ select true; $$;

revoke execute on function public.quiet_reporting_available() from public, anon;
grant execute on function public.quiet_reporting_available() to authenticated;

commit;
