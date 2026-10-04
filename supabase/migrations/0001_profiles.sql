-- SCRUM-38: the users table.
--
-- Supabase keeps login data (email, password hash) in its own auth.users table, which the app
-- cannot read. This table holds one row per user for everything else the app needs to know about
-- a user, and it is what other tables (walks, contacts, reports) should reference.
--
-- Data minimisation: the email address is NOT copied here. It stays in auth.users only.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- When the user ticked "I am 16 or older" at sign-up. This is the user's own statement, not a
  -- verified age.
  age_confirmed_at timestamptz
);

-- Row level security: without a policy nobody can read or write a row. This is what protects the
-- data, because the app's API key is public.
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- No insert, update or delete policy on purpose: rows are created by the trigger below, there is
-- nothing a user can edit yet, and a row disappears when its account is deleted (on delete cascade).

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, age_confirmed_at)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'age_confirmed' = 'true' then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
