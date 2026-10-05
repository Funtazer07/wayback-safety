# Backend

The backend is [Supabase](https://supabase.com): a hosted database (Postgres) with login built in.
There is no server code of our own. The app talks to Supabase directly from the phone.

## How login works

This follows the onboarding v2 wireframe (SCRUM-35), which was changed after the SCRUM-34 user
test: people asked for one-tap sign-in and stopped at email links, passwords and SMS codes.

1. **Welcome:** the user taps "Continue with Google". The app sends them to Google's own sign-in
   page, and they come back logged in. We never see a password.
2. **Name:** the first time, the app asks for a first name or nickname and the "I am 16 or older"
   confirmation. Nothing else.
3. **Home:** after that, and on every later visit, the user lands on Home.

Users stay logged in. Supabase keeps the session on the phone and renews it.

**Email as a fallback.** Under the Google button is "Use email instead": email and a password of
at least 8 characters. It is there for people without a Google account. It is not the main route
because testers stopped at passwords, and it is not in the wireframe.

The wireframe also shows "Continue with Apple" and "Use phone number instead". The group left
those out: Apple needs a paid developer account (about 99 US dollars a year) and phone sign-in a
paid SMS provider.

Code: `src/features/auth/` for signing in, `src/features/profile/` for the name. Use `useSession()`
to know who is logged in.

## Data model

Database changes live in `supabase/migrations/`, one numbered file per change. Never change the
database by hand in the dashboard without adding a file here, or the team loses track of what the
database looks like.

| Table      | What it holds                                                            |
| ---------- | ------------------------------------------------------------------------ |
| `profiles` | One row per user: `id`, `created_at`, `age_confirmed_at`, `display_name` |

Supabase keeps the login details in its own `auth.users` table. New tables (walks, contacts,
reports) reference `profiles.id`.

### Row level security

The app's API key is public: anyone can read it from the website. What protects the data is row
level security (RLS) in the database. **Every new table must have RLS turned on and a policy that
limits rows to their owner.** A table without RLS is readable by the whole internet. Copy the
pattern from `0001_profiles.sql`.

## Privacy decisions

Written down here because the app handles location and personal data.

- **Asked from the user:** a first name or nickname, and the 16+ confirmation. No legal name, no
  phone number, no profile picture.
- **What Google hands over:** signing in gives Supabase the user's email address, full name and
  profile picture link. With email sign-up Supabase stores the email address and a scrambled
  (hashed) password. All of this stays in Supabase's login table. The app does not read it and
  does not copy it into our own tables. The privacy statement must mention this.
- **Age:** the user confirms being 16 or older, and the time of that confirmation is stored. This
  is the user's own statement; the age is not verified.
- **Region:** the Supabase project must be in an EU region, so the data stays in the EU.
- **Not built yet:** deleting an account from inside the app, and a privacy statement. Both are
  needed before real users sign up. Until then an account can be deleted in the Supabase dashboard
  (**Authentication > Users**), which also removes the profile row.

## One-time setup

Done once by the owner of the Supabase account.

### 1. Create the project

On supabase.com, create a project in an **EU region** (for example Frankfurt). Keep the database
password in a password manager. It is never needed in the code.

### 2. Create the tables

In the dashboard: **SQL Editor > New query**. Paste the contents of each file in
`supabase/migrations/`, in order, and click **Run**.

### 3. Tell Supabase where the app lives

**Authentication > URL Configuration**:

- **Site URL:** `https://funtazer07.github.io/wayback-safety/`
- **Redirect URLs:** add `https://funtazer07.github.io/wayback-safety/`, `http://localhost:5173/`
  and `http://localhost:5174/`

Without this, Google cannot send users back to the app after signing in.

Supabase only sends users back to an address on this list. Anything else is replaced by the Site
URL. So if `npm run dev` prints a different address than `http://localhost:5173/` (it picks the
next free number when 5173 is taken by another project), signing in on your laptop lands you on
the live site instead. Add the address it printed to the list, or stop the other project.

### 4. Turn on Google sign-in

Free. Done in the [Google Cloud console](https://console.cloud.google.com) and in Supabase.

1. In Supabase, open **Authentication > Sign In / Providers > Google** and copy the **Callback
   URL** shown there.
2. In the Google Cloud console, create a project and set up the **OAuth consent screen** (app name
   "WayBack Safety", your email as contact). Then create an **OAuth client ID** of type **Web
   application** and paste the callback URL under **Authorised redirect URIs**.
3. Google shows a **Client ID** and a **Client secret**. Paste both into the Google provider in
   Supabase, switch it on and save.

While the consent screen is in "Testing" mode, only Google accounts added as test users can sign
in. Add the team and the test participants, or publish the consent screen.

### 5. Make email sign-up instant

**Authentication > Sign In / Providers > Email**: switch **Confirm email** off.

With it on, a new user must first tap a link in an email before they can log in. That breaks the
30-second goal, the link opens in the browser instead of the installed app, and Supabase's built-in
email sender only allows a few emails per hour. The cost of switching it off: someone can sign up
with an email address that is not theirs. For this app that only gets them an empty account.

### 6. Give the app its keys

**Project settings > API** shows the **Project URL** and the **publishable** key (older projects
call it the `anon` key). These two are public values.

- On your laptop: copy `.env.example` to `.env.local` and fill both in. Restart `npm run dev`.
- For the live site: in the GitHub repository, **Settings > Secrets and variables > Actions >
  Variables > New repository variable**, named `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY`. The next deployment uses them.

Each teammate needs their own `.env.local` with the same two values.

**Never** put the `secret` / `service_role` key, the Google client secret, or the database
password in the code, in `.env.local`, in GitHub variables or in the group chat.

## Giving teammates access to the database

The two keys from step 6 only let the app run. To look at tables or change the database, a
teammate needs their own access to the Supabase dashboard.

1. The teammate creates a free account on supabase.com (signing up with GitHub works).
2. The owner opens the organization in the dashboard, goes to **Team > Invite member**, enters the
   teammate's email address and picks the **Developer** role. Developer can see and change the
   data and run SQL, but cannot delete the project, invite people or touch billing.
3. The teammate accepts the invitation from the email. The project now shows up in their own
   dashboard.

Never share the owner's login or the database password instead. With separate accounts, access
can be taken away from one person without changing anything for the others.

What a teammate uses in the dashboard:

- **Table Editor:** look at the rows in a table, like a spreadsheet.
- **SQL Editor:** run a migration file, or a query to check something.
- **Authentication > Users:** see who signed up, and delete test accounts.

### Changing the database

There is one database. Your laptop and the live site both use it, so a change you make is live
for everyone straight away.

1. Write the change as a new numbered file in `supabase/migrations/` (the next number after the
   last one), with RLS and a policy if it is a new table.
2. Open a pull request and have a teammate review it, like any other change.
3. After it is merged, paste the file into **SQL Editor** and click **Run**. Tell the group chat
   that you ran it, so nobody runs it twice.

Editing a table by hand in the Table Editor is fine for test rows. It is not fine for columns,
tables or policies: those go through a migration file.

### This is real personal data

The dashboard shows what the app itself cannot see: the email addresses, and for Google sign-ins
the full names, of everyone who signed up. Look only at what you need, do not export or screenshot
it, and do not paste rows into the group chat.

## Limits to know about

- **Sign-in inside the installed app:** on iPhone, the Google page opens from the
  home-screen app and should return to it, but this has not been tested on a real phone yet. Check
  it in the next user test.
- **Free plan:** a project is paused after about a week without activity. Open the dashboard and
  click **Restore** if the app suddenly cannot reach the backend.

## If something fails

| Problem                                        | Likely cause                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| App says "The backend is not set up yet"       | `.env.local` is missing, or the GitHub variables are not set (step 6)     |
| "Unsupported provider" after tapping a button  | That sign-in method is not switched on in Supabase (step 4)               |
| Google says "Access blocked"                   | The consent screen is in Testing mode and this account is not a test user |
| Signing in on your laptop opens the live site  | The local address is not in the Redirect URLs (step 3)                    |
| "Could not load your profile"                  | The migrations were not all run (step 2), or there is no connection       |
| "Check your email" after signing up with email | "Confirm email" is still on (step 5)                                      |
| A query returns no rows but data exists        | The table's RLS policy does not allow it                                  |
