-- SCRUM-39 (onboarding v2): the user's first name or nickname.
--
-- Onboarding v2 signs users in with Google or email and then asks one thing: what to call them.
-- A trusted contact sees this name in the alert message. It is deliberately not a legal name.
--
-- age_confirmed_at is now filled in by the same screen (the "I am 16 or older" checkbox moved
-- there), so users need to be allowed to update their own row.

alter table public.profiles
  add column display_name text
  check (char_length(btrim(display_name)) between 1 and 40);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
