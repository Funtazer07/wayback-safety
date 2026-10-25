# Backend

The backend is [Supabase](https://supabase.com): a hosted database (Postgres) with login built in.
The app talks to Supabase directly from the phone. The only server code of our own is one Edge
Function that sends push notifications (see "Sending push").

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

| Table                | What it holds                                                                         |
| -------------------- | ------------------------------------------------------------------------------------- |
| `profiles`           | One row per user: `id`, `created_at`, `age_confirmed_at`, `display_name`              |
| `walks`              | One row per walk home: destination, start time, deadline, status, last known location |
|                      | and, once the user is home, the time of the check-in                                  |
| `contacts`           | One row per trusted contact or open invite: who invited, who accepted, the name the   |
|                      | user gave them, status, and while open, a fingerprint of the invite link              |
| `walk_contacts`      | Which contacts follow which walk. Chosen when the walk starts                         |
| `reports`            | Place reports and broken street lights: category, a rounded spot or the lamp, time    |
| `push_subscriptions` | One row per phone that allowed notifications: the push address and its keys           |

Supabase keeps the login details in its own `auth.users` table. New tables (contacts, reports)
reference `profiles.id`.

### Walks and the timer

The timer lives in the database, not on the phone (SCRUM-43). When a walk starts, the app sends
how many minutes it may take and the database stores the deadline using its own clock. The phone
only shows a countdown to that deadline. Locking the phone or closing the app changes nothing: the
deadline is still there when the app comes back.

The app cannot write to `walks` directly. It calls these database functions:

| Function               | What it does                                                              |
| ---------------------- | ------------------------------------------------------------------------- |
| `start_walk`           | Creates the walk with deadline = now + minutes (1 to 180). One at a time  |
|                        | Also saves which contacts follow the walk (see Trusted contacts)          |
| `update_walk_location` | Replaces the last known location of a walk that is active or overdue      |
| `check_in`             | Ends the walk as `safe`, saves the time and erases the last location      |
| `extend_walk`          | Moves the deadline of an active walk later (see Extending and cancelling) |
| `cancel_walk`          | Ends an active walk as `cancelled` and erases the last location           |

A walk has a status: `active` (on the way), `safe` (checked in), `overdue` (deadline passed, alert
sent) or `cancelled` (stopped by the user without a check-in). A walk is late when it is still
`active` after its deadline. The scheduled check sets `overdue` (see "Late walks").

Code: `src/features/walk/walk.ts` has `startWalk`, `updateWalkLocation`, `checkInWalk`,
`extendWalk`, `cancelWalk` and `fetchActiveWalk`. The screens are in the same folder: `StartWalkScreen` (destination and timer)
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

### Extending and cancelling

Both run on the server (SCRUM-63). The buttons on the walk screen are built in SCRUM-94.

**Extending** adds minutes to the deadline. If the deadline has already passed, for example during
the "Are you OK?" grace period, the minutes count from now instead, so the user really gets the
time they asked for. The client's rule is that the app never moves the deadline by itself: the
server only does it when the user taps a button.

**Cancelling** ends the walk as `cancelled` and saves the time in `cancelled_at`. Like a check-in,
it stops the timer and erases the last known location, and the walk refuses new locations from then
on. The contacts get a push notification with the time from `cancelled_at` (see "Sending push").

Assumptions, all in `0006_extend_and_cancel.sql`:

- One tap adds 1 to 60 minutes. The buttons offer 5, 10 and 15.
- The deadline is never more than 3 hours away, the same limit as when a walk starts.
- Only an `active` walk can be extended or cancelled. Once a walk is `overdue` the contacts have
  been alerted, so the user checks in instead and the contacts hear they are safe.

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

### Notifications

Decided in SCRUM-66 (research on Confluence, 13 Oct): alerts go out by **Web Push only**, sent
from the server. No email, because sending email to other people needs a paid domain. A Supabase
Edge Function sends the messages (see "Sending push" below, SCRUM-69), and a scheduled job in the
database (`pg_cron`, SCRUM-73) will start the late-walk alerts, so they also arrive when the phone
is locked or the app is closed.

What this means for people:

- A user or contact only gets notifications if they allowed them. On iPhone that also needs iOS
  16.4 or newer and the app on the Home Screen.
- Every contact therefore needs the app and an account (see Trusted contacts).
- Messages pass through Apple's or Google's push service, encrypted on the way. Everything else
  stays in our Supabase project in the EU.
- The free Supabase plan pauses a project after a week without activity. While paused, no alert
  goes out. Fine for testing, not for real users.

How a phone is signed up (SCRUM-68):

1. The user taps "Allow notifications" on a card. It is on the start-walk screen now, and the
   screen where a contact accepts an invite (SCRUM-60) will show it too. iPhones only ask after a
   tap, which is why there is a button.
2. The browser asks the push service for an address for this phone, and the app saves it with
   `save_push_subscription` in the `push_subscriptions` table: one row per phone.
3. Each time the app opens with notifications on, it saves the row again, so a phone always
   belongs to the account that is signed in now.

`disableNotifications()` deletes the row and stops the subscription in the browser. There is no
button for it yet; a settings screen will use it. Deleting the account deletes the rows too.

The service worker that vite-plugin-pwa writes cannot show notifications, so it loads
`public/push-sw.js`, which can. That file also opens the app when a notification is tapped. On
`npm run dev` there is no service worker, so the card says notifications only work in a build
(`npm run build`, then `npm run preview -- --port 5173`).

Push uses a key pair (VAPID): the public key is in the app as `VITE_VAPID_PUBLIC_KEY`, the private
key only in Supabase Edge Function secrets. See "Push keys" under One-time setup.

Code: `src/features/notifications/`.

### Sending push

When a walk starts, is checked in, is cancelled or becomes overdue, its contacts get a push
notification (SCRUM-69, SCRUM-74). No location is ever in these messages, only the time it was
saved:

| When                          | Title                      | Text                                                                                                                                                                                       |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The walk starts               | Anna is on the way home    | Expected home at 22:36.                                                                                                                                                                    |
| The user checks in            | Anna has arrived safely    | Checked in at 22:31.                                                                                                                                                                       |
| The user cancels the walk     | Anna stopped the walk      | Cancelled at 22:20. No check-in will follow.                                                                                                                                               |
| The walk becomes overdue      | Anna hasn't checked in yet | Anna was expected home at 22:36 but hasn't confirmed arriving safely. This does not necessarily mean something is wrong. Last known location from 22:31, not live. Open WayBack to see it. |
| The user checks in after that | Anna is safe               | Anna checked in at 22:44, after the missed check-in alert. No need to look any further.                                                                                                    |

Without a saved location the alert says "No location was shared during this walk." Tapping the
alert opens the app with `?walk=<id>`; the contact's screen with the location on a map is SCRUM-102.
Until that is built the app opens on its start page.

The cancelled message was added on 24 Oct: SCRUM-63 and SCRUM-12 promise it, and no other subtask
built it. Extending a walk sends nothing.

How it works:

1. `start_walk`, `check_in` or `cancel_walk` changes the `walks` table. A trigger in the database
   (`0009_walk_push.sql`) notices and calls the Edge Function `send-walk-push` with the walk's id.
   The database makes this call by itself, after the change is saved, so it also works when the
   phone is locked or loses its connection right after the tap.
2. The Edge Function (`supabase/functions/send-walk-push/index.ts`) looks up the walk's contacts,
   keeps those who accepted and are not paused, and finds their phones in `push_subscriptions`
   (SCRUM-68).
3. It sends the message to each phone with the `web-push` library, through Apple's or Google's push
   service. Phones that no longer exist are removed from `push_subscriptions`.

Who gets a message, and the exact wording, are in `supabase/functions/send-walk-push/walkPush.ts`, tested
by `walkPush.test.ts`. A contact only gets a message when they are linked to that walk, which is
chosen at the start of the walk. Until the contacts screens (SCRUM-60) let users pick contacts, no
walk has any, so no message goes out.

The Edge Function is called with a secret that only the database knows. Without it, the function
answers "Forbidden", so nobody else can make phones buzz.

A problem with push never stops a walk (`0010_walk_push_never_blocks.sql`). If the call cannot even
be queued, for example because of a wrong Vault value, the walk is still started, checked in or
cancelled, and the database writes a warning to **Logs > Postgres** instead. The contacts then miss
that one message.

Assumption: a message that cannot reach a phone within an hour (phone off) is dropped. "Anna is on
the way home" an hour late would only confuse. "Are you OK?" is kept only for the grace period.

The same function also sends the "Are you OK?" warning to the walker and the alert to the contacts
(see "Late walks"). The alert is kept for a day for a phone that is off.

#### Setting it up

Done once by the owner of the Supabase account, in this order. The push key pair comes from
SCRUM-68 ("Push keys"); the private key never goes in the code, `.env.local`, GitHub or the chat.

1. **Edge Function secrets.** **Edge Functions > Secrets**, add:
   - `VAPID_PUBLIC_KEY`: the same public key as `VITE_VAPID_PUBLIC_KEY` in the app.
   - `VAPID_PRIVATE_KEY`: the private key of that pair.
   - `VAPID_SUBJECT`: a way for Apple's and Google's push services to reach whoever sends the
     messages: `mailto:` and a team email address, or the live site's `https://` address.
   - `WALK_PUSH_SECRET`: a long random text. Make one with
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
2. **Deploy the function.** **Edge Functions > Deploy a new function > Via editor**, name
   `send-walk-push`. Paste `supabase/functions/send-walk-push/index.ts` into `index.ts`, and add a
   second file named `walkPush.ts` (next to `index.ts`, no folder) with the contents of
   `supabase/functions/send-walk-push/walkPush.ts`. Turn **Verify JWT** off: the function checks
   its own secret instead. Copy the function's URL.
3. **Vault secrets.** **Project settings > Vault** (or Integrations > Vault), add two secrets:
   - `walk_push_url`: only the function's address, nothing around it:
     `https://<project>.supabase.co/functions/v1/send-walk-push`. The dashboard also shows a whole
     `curl` command; do not copy that.
   - `walk_push_secret`: the same text as `WALK_PUSH_SECRET`.
4. **Run the migrations.** `0009_walk_push.sql`, then `0010_walk_push_never_blocks.sql`, in the SQL
   Editor, after 0005, 0006 and 0007.

When the function code changes, deploy it again the same way. To see what happened to a message,
open the function's **Logs**, or run `select * from net._http_response order by created desc limit
10;` in the SQL Editor to see what the function answered. When nothing shows up there at all, look
for a `queue_walk_push` warning under **Logs > Postgres**.

### Late walks

A job in the database checks every minute for walks that ran past their deadline (SCRUM-73,
`0011_late_walks.sql`). It runs on the server, so it works when the phone is locked, the app is
closed or the battery is dead. For each late walk, once per deadline:

1. **Warning.** The deadline passed and the walk is still `active`: the walker gets "Are you OK?"
   on their own phone ("Your timer has run out. Open WayBack to say you are home or add time.
   Otherwise your contacts are told in 5 minutes."). The time is saved in `warned_at`.
2. **Overdue.** Still `active` 5 minutes after that warning: the status becomes `overdue` and the
   time is saved in `overdue_at`. That change sends the alert to the walk's contacts (SCRUM-74,
   `0012_overdue_alert.sql`): who missed the check-in, and when the last location was saved. If
   the user checks in afterwards, the contacts get "Anna is safe".
3. **Erase the location.** 24 hours after a walk became overdue, its last known location is erased,
   and the walk takes no new location. Assumption, decided on 25 Oct until SCRUM-71 and SCRUM-30
   decide: by then the contacts have looked, or the alert is old news.

Rules that keep it fair:

- The grace period counts from the warning, not from the deadline. If the check runs late, the user
  still gets the full 5 minutes after the warning.
- Checking in, cancelling or extending during the grace period stops it. After extending, the walk
  is warned again only when the new deadline passes; it can never become overdue on an old
  warning.
- A walk is warned once per deadline and becomes overdue once. An overdue walk can still be checked
  in (`0004_check_in.sql`).

Assumptions, until SCRUM-71 (research) decides:

- The grace period is 5 minutes, from the 05:00 on the SCRUM-72 prototype. It is in two places
  that must match: `grace_period` in `0011_late_walks.sql` and `GRACE_MINUTES` in
  `supabase/functions/send-walk-push/walkPush.ts`.
- The check runs every minute, so the warning can come up to a minute after the deadline.

The free Supabase plan pauses a project after a week without activity. While it is paused the
check does not run, and nobody is warned or alerted.

To set it up, after "Sending push" works: deploy `send-walk-push` again (it now knows `are_you_ok`),
then run `0011_late_walks.sql`. If the SQL Editor says pg_cron is not available, turn it on under
**Database > Extensions** first. **Integrations > Cron** then shows the job `check-late-walks` and
each run. The rules are tested by `supabase/tests/late_walks_test.sql` (see "Testing the database").

For the alert (SCRUM-74): deploy `send-walk-push` again (it now knows `overdue`), then run
`0012_overdue_alert.sql`. Tested by `supabase/tests/overdue_alert_test.sql`.

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
- **Location after the walk:** checking in or cancelling erases the last known location, and the
  walk refuses new locations afterwards. A walk that became overdue keeps it for 24 hours, so the
  contacts know where to look, and then it is erased too (assumption until SCRUM-71 and SCRUM-30
  decide). The alert itself never carries the location, only the time it was saved.
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
- **Push messages:** hold the user's name and a time, never a location. They pass through Apple's
  or Google's push service, encrypted on the way, so those services cannot read them. Only
  contacts who accepted and are not paused get them.
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

### Testing the database

The app's tests (Vitest) never reach the database. Rules that live in the database itself are
tested with SQL files in `supabase/tests/`. Paste one into the **SQL Editor** and click **Run**,
after its migration is run. Each file makes up its own users, runs inside one transaction and ends
with `rollback`, so nothing stays behind and no push message is sent. The last result is "ALL
CHECKS PASSED"; a failing check stops with a message starting with "FAIL:".

| File                     | Tests                                                                       |
| ------------------------ | --------------------------------------------------------------------------- |
| `late_walks_test.sql`    | The warning, the grace period and overdue (SCRUM-73)                        |
| `overdue_alert_test.sql` | The alert, "is safe" afterwards, erasing the location after 24 h (SCRUM-74) |

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
