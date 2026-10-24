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

| Table           | What it holds                                                                         |
| --------------- | ------------------------------------------------------------------------------------- |
| `profiles`      | One row per user: `id`, `created_at`, `age_confirmed_at`, `display_name`              |
| `walks`         | One row per walk home: destination, start time, deadline, status, last known location |
|                 | and, once the user is home, the time of the check-in                                  |
| `contacts`      | One row per trusted contact or open invite: who invited, who accepted, the name the   |
|                 | user gave them, status, and while open, a fingerprint of the invite link              |
| `walk_contacts` | Which contacts follow which walk. Chosen when the walk starts                         |
| `reports`       | Place reports and broken street lights: category, a rounded spot or the lamp, time    |

Supabase keeps the login details in its own `auth.users` table. New tables (contacts, reports)
reference `profiles.id`.

### Walks and the timer

The timer lives in the database, not on the phone (SCRUM-43). When a walk starts, the app sends
how many minutes it may take and the database stores the deadline using its own clock. The phone
only shows a countdown to that deadline. Locking the phone or closing the app changes nothing: the
deadline is still there when the app comes back.

The app cannot write to `walks` directly. It calls three database functions:

| Function               | What it does                                                             |
| ---------------------- | ------------------------------------------------------------------------ |
| `start_walk`           | Creates the walk with deadline = now + minutes (1 to 180). One at a time |
|                        | Also saves which contacts follow the walk (see Trusted contacts)         |
| `update_walk_location` | Replaces the last known location of a walk that is active or overdue     |
| `check_in`             | Ends the walk as `safe`, saves the time and erases the last location     |

A walk has a status: `active` (on the way), `safe` (checked in) or `overdue` (deadline passed, alert
sent). A walk is late when it is still `active` after its deadline. Nothing sets `overdue` yet;
that belongs to the alert story.

Code: `src/features/walk/walk.ts` has `startWalk`, `updateWalkLocation`, `checkInWalk` and
`fetchActiveWalk`. The screens are in the same folder: `StartWalkScreen` (destination and timer)
and `WalkScreen` (time left and the "I'm home" button). While the walk screen is open, the app
sends the location once a minute.

### Checking in

The "I'm home" button on the walk screen calls `check_in` (SCRUM-48). In one step the database:

- sets the status to `safe`. That stops the timer: only an `active` walk can become late.
- saves the time in `checked_in_at`, using its own clock. SCRUM-7 (Sprint 2) reads this to tell
  the contacts. Nothing is sent to anyone yet, and the app does not say that it is.
- erases the last known location. From then on the walk refuses new locations, and the app stops
  reading the phone's location.

The app then shows "You arrived safely!". Closing that message brings the user back to Home. If
the server cannot be reached, the walk keeps running and the user can tap the button again.

Assumptions: a walk that is already `overdue` can still be checked in, so someone who is late can
say they are home after all. And the last location is erased at the check-in instead of kept for a
while. Both are in `0004_check_in.sql` and are ours to change when SCRUM-7 is built.

A locked phone pauses the page, so no location is sent and the countdown on screen stops moving.
The deadline itself is not affected. When the phone is unlocked the app reads the clock again and
sends a fresh location straight away (SCRUM-45). After the deadline the walk screen says "Time is
up" instead of "0 min left".

The destination is only a name for now ("Home" or a typed address). The app cannot look up where
an address is yet, so the destination's place on the map stays empty and the app cannot estimate
the walking time. The user sets the timer.

Assumption: the 180-minute maximum is our own guess at the longest walk home. Change it in a new
migration if the timer screen needs more.

### Trusted contacts

A trusted contact is another WayBack user who looks out for the user (SCRUM-59). Decided on
15 Oct: a contact needs their own account. Alerts go out by Web Push only (SCRUM-66), and a push
notification can only reach someone who installed the app and signed in.

How someone becomes a contact:

1. The user gives the contact a name, for example "Mum", and gets an invite link. They send it
   themselves, in WhatsApp or their own email. We send no email.
2. The contact opens the link, signs in, sees who invited them and taps accept or decline.
3. After accepting, the user can pause or remove the contact. The contact can remove the link
   too, to stop looking out. Removing a contact also takes them off the walks they followed.

The link works once and for 48 hours. The database keeps only a fingerprint (SHA-256 hash) of
the secret in the link, so someone who reads the table cannot rebuild a working link. The
fingerprint is erased once the invite is accepted.

When a walk starts, the user picks which contacts follow it. They are saved in `walk_contacts`.
Only the user's own accepted, not paused contacts can be picked. A walk with no contacts is
allowed, because users have none until the contacts screens (SCRUM-60) are built. A contact paused
during a walk stays in `walk_contacts`; the alert code (SCRUM-69, SCRUM-74) must skip paused
contacts itself.

The app cannot write to `contacts` or `walk_contacts` directly. It calls these functions, or
deletes a contact row, which both sides are allowed to do:

| Function             | What it does                                                    |
| -------------------- | --------------------------------------------------------------- |
| `create_invite`      | Creates an invite and returns the secret for the link, once     |
| `get_invite`         | Tells the person who opened the link who sent it                |
| `accept_invite`      | Links the logged-in user as the contact. The link stops working |
| `decline_invite`     | Deletes the invite                                              |
| `set_contact_paused` | Pauses a contact, or lets them follow walks again               |

Code: `src/features/contacts/contacts.ts`. The screens come in SCRUM-60, including reading
`?invite=` from the link when the app opens.

Assumptions: at most 10 contacts and open invites per user (the client talked about three).
Expired invites are deleted the next time the user creates one. Both are in `0005_contacts.sql`.

Not here yet: an "I'm watching" signal from the contact to the user. The client asked for it
(SCRUM-27 comment, 13 Oct). It is explored in SCRUM-98 and comes in a later migration.

### Reports

One table, `reports`, for two kinds of report (SCRUM-92):

- **Place report** (SCRUM-8, the form comes in SCRUM-96): a category (no light, quiet or empty, an
  unsafe feeling, other), the spot where the user is, and an optional note of at most 140
  characters.
- **Broken street light** (the map, see [map.md](map.md)): one lamp from the register, saved at
  the lamp's own spot with its street.

Decided on 22 Oct, different from the SCRUM-92 text in Jira, which kept reports hidden until
SCRUM-10: every signed-in user can see reports, so the map can show them. Hidden from other users:

- **who** reported it. The table keeps `user_id` only to delete a user's reports with their
  account and to limit how many reports one person makes. Column rights stop the app from reading
  it.
- **where the reporter was.** A place report is rounded to 3 decimals before it leaves the phone,
  and the server rounds it again. A broken-light report uses the lamp's spot, which is public data.
- **the note**, until reports can be flagged (SCRUM-32). A note could name or describe someone. The
  team can read notes in the dashboard.

The app cannot write to `reports` directly. It calls these functions:

| Function              | What it does                                                      |
| --------------------- | ----------------------------------------------------------------- |
| `report_place`        | Saves a place report at a rounded spot                            |
| `report_broken_light` | Saves a broken light. A light that is already reported is refused |
| `mark_light_working`  | "It works again": removes the report of that lamp. Any user may   |

Code: `src/features/reports/reports.ts` (place reports) and `src/features/map/brokenLights.ts`
(broken lights).

Assumptions until SCRUM-90 (research) decides, all in `0008_reports.sql`:

- The spot is rounded to 3 decimals: about 110 m north–south and 70 m east–west in Eindhoven.
- A report is kept 30 days. Expired reports are not shown, and the next new report deletes them.
- One person can make at most 20 reports a day.

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
- **Location:** a walk stores the destination and one last known location. Each update
  overwrites the previous one, so there is no trail of where someone walked. Only the user can
  read their own walks.
- **Location after the walk:** checking in erases the last known location and stops the app from
  reading the phone's location. A walk that is never checked in keeps its last location.
- **Route planning:** to compare routes on the map, the start (often the user's position) and the
  destination are sent to the free FOSSGIS route planner (routing.openstreetmap.de), outside our
  own backend. Nothing is stored by our app. The privacy statement must mention this. See
  [map.md](map.md).
- **Reports:** every signed-in user sees the category, the spot and the time, never who reported
  it. A place report is stored rounded (about 100 m), never at the GPS position; a broken light at
  the lamp's own spot. Notes are hidden from other users until flagging exists (SCRUM-32). No
  photos and no link to a walk or route. Reports are deleted after 30 days, and with the account.
  See Reports above.
- **Not decided yet:** how long a finished walk is kept. Nothing deletes walks yet, so the
  destination, the start time and the check-in time stay until the account is deleted, and so
  does the last location of a walk without a check-in. Decide this before real users sign up.
- **Contacts:** about a contact we store only the name the user gives them and, once they accept,
  a link to their account. No phone number and no email address. The contact can read the rows
  where they are the contact, including that name. Nobody becomes a contact without accepting,
  and either side can end it.
- **Invite links:** only a fingerprint of the link is stored, it works for 48 hours, and it is
  erased when the invite is accepted.
- **Push subscriptions:** per phone we store only the push service address and its two keys. No
  device name, browser or IP address. The row is deleted when notifications are turned off on that
  phone, and with the account.
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

### 7. Push keys

Push needs one key pair for the whole project, made once. This command uses only Node's built-in
`crypto`, no package:

```
node -e "const k=require('crypto').generateKeyPairSync('ec',{namedCurve:'prime256v1'});const p=k.publicKey.export({format:'jwk'});const b=s=>Buffer.from(s,'base64url');console.log('VITE_VAPID_PUBLIC_KEY='+Buffer.concat([Buffer.from([4]),b(p.x),b(p.y)]).toString('base64url'));console.log('VAPID_PRIVATE_KEY='+k.privateKey.export({format:'jwk'}).d)"
```

- **Public key** (`VITE_VAPID_PUBLIC_KEY`): in `.env.local` on each laptop, and as a GitHub
  repository variable with the same name, like step 6. Restart `npm run dev`.
- **Private key** (`VAPID_PRIVATE_KEY`): only in Supabase, **Edge Functions > Secrets**. The
  sending function (SCRUM-69) reads it there. Never in the code, `.env.local`, GitHub or the group
  chat.

Make the pair once. A new pair makes every saved subscription useless: everyone would have to allow
notifications again.

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
| "Could not check you in" on every tap          | `0004_check_in.sql` was not run yet (step 2), or there is no connection   |
| "Check your email" after signing up with email | "Confirm email" is still on (step 5)                                      |
| A query returns no rows but data exists        | The table's RLS policy does not allow it                                  |
