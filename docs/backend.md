# Backend

The backend is [Supabase](https://supabase.com): a hosted database (Postgres) with login built in.
There is no server code of our own. The app talks to Supabase directly from the phone.

## How login works

The sign-up screen follows the SCRUM-35 wireframe and the SCRUM-34 research: the user gives an
email address, confirms being 16 or older, and nothing else.

- **Send me a link:** Supabase emails a login link. Tapping it logs the user in, in the browser
  where the link opens.
- **Use a password:** email and password, at least 8 characters.
- **Installed app on iPhone:** the link opens in Safari, not in the app on the home screen, so the
  installed app stays logged out. Those users log in with a password; the "Check your email" screen
  tells them so. A code in the email would fix this, but Supabase only allows editing the email
  text once the project has its own email service (see "Limits to know about").
- Users stay logged in. Supabase keeps the session on the phone and renews it.

Code: `src/features/auth/`. Use `useSession()` to know who is logged in.

## Data model

Database changes live in `supabase/migrations/`, one numbered file per change. Never change the
database by hand in the dashboard without adding a file here, or the team loses track of what the
database looks like.

| Table      | What it holds                                            |
| ---------- | -------------------------------------------------------- |
| `profiles` | One row per user: `id`, `created_at`, `age_confirmed_at` |

Supabase keeps emails and passwords in its own `auth.users` table. New tables (walks, contacts,
reports) reference `profiles.id`.

### Row level security

The app's API key is public: anyone can read it from the website. What protects the data is row
level security (RLS) in the database. **Every new table must have RLS turned on and a policy that
limits rows to their owner.** A table without RLS is readable by the whole internet. Copy the
pattern from `0001_profiles.sql`.

## Privacy decisions

Written down here because the app handles location and personal data.

- **Asked at sign-up:** email address only. No name, no phone number (SCRUM-34).
- **Age:** the user confirms being 16 or older, and the time of that confirmation is stored. This
  is the user's own statement; the age is not verified.
- **Email is stored once**, in Supabase's login table. It is not copied into our own tables.
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
- **Redirect URLs:** add `https://funtazer07.github.io/wayback-safety/` and
  `http://localhost:5173/`

Without this, the link in the email sends users to the wrong place.

### 4. Give the app its keys

**Project settings > API** shows the **Project URL** and the **publishable** key (older projects
call it the `anon` key). These two are public values.

- On your laptop: copy `.env.example` to `.env.local` and fill both in. Restart `npm run dev`.
- For the live site: in the GitHub repository, **Settings > Secrets and variables > Actions >
  Variables > New repository variable**, named `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY`. The next deployment uses them.

Each teammate needs their own `.env.local` with the same two values.

**Never** put the `secret` / `service_role` key or the database password in the code, in
`.env.local`, in GitHub variables or in the group chat. That key bypasses all security rules.

## Limits to know about

- **Emails:** Supabase's built-in email sender only allows a few emails per hour and is meant for
  testing. The exact limit is shown under **Authentication > Rate Limits**. When "Send me a link"
  stops working during a test session, this is the likely cause; logging in with a password still
  works. For real users the project needs its own email service (custom SMTP). That also unlocks
  editing the email text, which the built-in sender does not allow.
- **Free plan:** a project is paused after about a week without activity. Open the dashboard and
  click **Restore** if the app suddenly cannot reach the backend.

## If something fails

| Problem                                  | Likely cause                                                          |
| ---------------------------------------- | --------------------------------------------------------------------- |
| App says "The backend is not set up yet" | `.env.local` is missing, or the GitHub variables are not set (step 4) |
| Link in the email opens the wrong page   | Site URL or Redirect URLs are wrong (step 3)                          |
| "Email rate limit exceeded"              | See "Emails" above; wait, or use a password                           |
| "Signups not allowed for otp"            | Logging in with an email address that has no account yet              |
| A query returns no rows but data exists  | The table's RLS policy does not allow it                              |
