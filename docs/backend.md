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
| `walk_contacts`      | Which contacts follow which walk, and when one tapped "I'm watching" (SCRUM-114)      |
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
`extendWalk`, `cancelWalk`, `fetchCurrentWalk` and `fetchWalkContactNames`. The screens are in the
same folder: `StartWalkScreen` (destination and timer) and `WalkScreen` (time left and the "I'm
home" button). While the walk screen is open, the app sends the location once a minute.

The timer is a slider in steps of one minute, with − and + for a single minute and four quick
choices (`TimerPicker.tsx`, `timerSuggestion.ts`). Decided on 26 Oct: the design's steps of 5
minutes felt too rough. With a route planned on Home it adapts to that route, so the user does not
have to guess and a slower walk does not set off "Are you OK?" (Studio Krom feedback):

- it starts at the walking time plus 5 minutes (a 12-minute route starts at 17);
- it cannot go below the walking time, and goes up to three times it, at least an hour;
- the quick choices are the walking time plus 5, 10, 15 and 20 minutes.

Without a route it starts at the design's 20 minutes, goes from 5 minutes to 2 hours, and the quick
choices are 10, 15, 20 and 30. _Assumptions:_ the 5 extra minutes, three times the walking time,
and 2 hours without a route. The server accepts 1 to 180 minutes.

`fetchCurrentWalk` returns an `active` walk, and also an `overdue` one: the user has not checked in
yet and must still be able to tap "I'm home" to tell their contacts they are safe.

### The "Are you okay?" screen

When the deadline passes, the walk screen turns into screen 06 of the SCRUM-72 prototype
(SCRUM-101, `AreYouOkScreen.tsx`). It works with the scheduled check on the server (SCRUM-73):

- **Grace period:** "Are you okay?", who will be told ("We'll notify Mum and Alex in 02:32"), "I'm
  home" and "I'm okay · Add 5 minutes". The countdown starts at `warned_at`, the moment the server
  sent the warning, because that is where the server counts from too. Until the screen knows that
  moment it counts from the deadline, which shows a little less time, never more.
- **Overdue:** "We told Mum and Alex", and "I'm home" to say they are safe. Adding time is not
  possible any more: the server refuses to extend an overdue walk.
- **Nobody follows the walk:** the screen says nobody will be alerted, instead of promising an
  alert.

During the grace period the app asks the server for the walk every 15 seconds and when it comes
back on screen, so it notices the warning and the change to overdue. "I need help" from the
prototype is SOS (SCRUM-28), not built yet.

The overdue text says the contacts were told. That is only true once SCRUM-74 sends the alert, so
SCRUM-101 is merged together with or after SCRUM-74.

3 minutes of grace (`GRACE_MINUTES` in `src/features/walk/grace.ts`, the same as on the server),
decided on 26 Oct. "I'm okay · Add 5 minutes" is separate (`EXTEND_MINUTES`) and stays 5 minutes,
as in the design. Assumption: asking the server every 15 seconds.

### Checking in

The "I'm home" button on the walk screen calls `check_in` (SCRUM-48). In one step the database:

- sets the status to `safe`. That stops the timer: only an `active` walk can become late.
- saves the time in `checked_in_at`, using its own clock. The "home safe" message to the
  contacts (SCRUM-69) and the "You're home" screen use this time.
- erases the last known location. From then on the walk refuses new locations, and the app stops
  reading the phone's location.

The app then shows "You're home." (screen 12, SCRUM-106, `HomeSafeScreen.tsx`): when the walk
ended, what the check-in did (timer stopped, location sharing stopped, check-in saved), and who was
told. Only contacts who accepted and are not paused get the message (as in `recipientsOf`); a
contact with notifications off (SCRUM-103) is named as not reached. The design says "delivered",
but the app can only know the message was sent, so it says "sent". A walk without contacts has no
contacts card. "Back to your places" brings the user back to Home. If the server cannot be
reached, the walk keeps running and the user can tap the button again.

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
3. **Accepting links both ways** (`0014_mutual_contacts.sql`): the contact looks out for the user,
   and the user looks out for the contact, under the name the user chose in onboarding. Decided on
   26 Oct after testing on two phones, different from SCRUM-27 and SCRUM-59 in Jira, which describe
   one way. The accept screen says so before the tap, because the contact's own walks are shared
   too. A link back that already existed (also a paused one) is left as it was.
4. After that, each side can pause or remove the other. Removing one direction leaves the other.
   Removing a contact also takes them off the walks they followed.

An invite link opens in the browser, not in an app installed on the Home Screen. Accepting there
is saved on the server. On iPhone the Home Screen app has its own storage, so after adding WayBack
there the contact signs in again and turns on notifications under Contacts; the accept screen says
so.

The link works once and for 48 hours. The database keeps only a fingerprint (SHA-256 hash) of
the secret in the link, so someone who reads the table cannot rebuild a working link. The
fingerprint is erased once the invite is accepted.

When a walk starts, the user picks which contacts follow it. They are saved in `walk_contacts`.
Only the user's own accepted, not paused contacts can be picked. A walk with no contacts is
allowed: someone without contacts can still use the timer, and the screen then says nobody will
be alerted. A contact paused
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

Code: `src/features/contacts/contacts.ts` talks to the database.

#### The contacts screens

Built in SCRUM-60 from the prototype:

- **Contacts tab → Activity** (screen 09, `src/features/activity/`): what the tab opens on since
  26 Oct, as in the prototype. "Anna's account", then one card per person who trusts the user,
  newest first: "hasn't checked in · View walk", "started a walk", "arrived safely" or "stopped
  the walk" (see "The contact's view"). Under the feed: "Trusted contacts ›".
- **Trusted contacts** (screen 14, `ContactsScreen.tsx`), opened from Activity, with "‹ Your
  circle" back to it: the list with "Can receive alerts" or "Notifications off: cannot receive
  alerts" (SCRUM-103), "Invitation pending", "Invitation expired" or "Updates paused". Tapping a
  contact shows its options: Pause or Resume updates, Remove contact (asks first), or Cancel
  invite for an open one.
- **Can this contact get an alert?** (SCRUM-103): alerts go out by Web Push only, so a contact who
  never allowed notifications gets nothing. `contact_alert_status`
  (`0016_contact_alerts_and_walk_status.sql`) answers only yes or no per contact who accepted:
  does their account have at least one phone in `push_subscriptions`. Start a walk also marks such
  a contact with "Notifications off: will not get an alert". If the question fails, the list shows
  without that line.
- **Invite by link or email** (`InviteSheet.tsx`): the user types what they call the contact, gets
  the link, and the phone's own share menu opens (WhatsApp, Mail, Messages...). Where there is no
  share menu, mostly on laptops, the link is shown with a Copy button. Decided on 25 Oct: we send no
  email ourselves (SCRUM-66).
- **Accepting** (screen 09's "Sam invited you", `AcceptInviteScreen.tsx`): opening the link shows
  who invited them, what accepting means, and Accept or Decline. After accepting, the app offers to
  turn on notifications; the system question only appears after that tap. The `?invite=` part of
  the link is kept in the browser tab while signing in, like `?walk=`.
- **Start a walk** (screen 04, `ContactToggles.tsx`): "Notify these trusted contacts" with a switch
  per contact who accepted. All are on by default; the ones that are on follow this walk.

Not built: the contact's own list of people they look out for (a contact can only leave through
the database for now), and the Activity feed from screen 09.

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

1. The user taps "Allow notifications" on a card. It is on the start-walk screen, on the
   screen where a contact has just accepted an invite and on the Contacts tab (SCRUM-60), and on
   the Account tab (SCRUM-105). iPhones only ask after a
   tap, which is why there is a button.
2. The browser asks the push service for an address for this phone, and the app saves it with
   `save_push_subscription` in the `push_subscriptions` table: one row per phone.
3. Each time the app opens with notifications on, it saves the row again, so a phone always
   belongs to the account that is signed in now.

Turning notifications off (SCRUM-105): `disableNotifications()` deletes the row and stops the
subscription in the browser. Either step alone stops the alerts (without the subscription the push
service refuses, and the Edge Function then deletes the row), so it only fails when both fail, for
example offline. It runs from "Turn off notifications" on the Account tab, and before every log
out, while the user is still signed in: afterwards the server would refuse to delete the row, and a
shared or borrowed phone would keep getting the alerts of the person who left. When it fails, the
user is still logged out and the welcome screen says that notifications may still arrive. Deleting
the account deletes the rows too.

The service worker that vite-plugin-pwa writes cannot show notifications, so it loads
`public/push-sw.js`, which can. That file also opens the app when a notification is tapped, and
tells an open app that a push arrived (`src/lib/pushMessages.ts`). A push means a walk changed, so
the Activity feed, the contact's walk screen and the walker's own walk screen ask the server again
at once, instead of waiting for their next check. Added on 26 Oct after testing: "overdue" only
showed after switching screens. Phones without notifications still rely on the regular checks. On
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
alert opens the app with `?walk=<id>` on the contact's view of that walk (see "The contact's view").

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
chosen at the start of the walk with the switches on the start-walk screen (SCRUM-60).

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
   Otherwise your contacts are told in 3 minutes."). The time is saved in `warned_at`.
2. **Overdue.** Still `active` 3 minutes after that warning: the status becomes `overdue` and the
   time is saved in `overdue_at`. That change sends the alert to the walk's contacts (SCRUM-74,
   `0012_overdue_alert.sql`): who missed the check-in, and when the last location was saved. If
   the user checks in afterwards, the contacts get "Anna is safe".
3. **Erase the location.** 24 hours after a walk became overdue, its last known location is erased,
   and the walk takes no new location. Assumption, decided on 25 Oct until SCRUM-71 and SCRUM-30
   decide: by then the contacts have looked, or the alert is old news.

Rules that keep it fair:

- The grace period counts from the warning, not from the deadline. If the check runs late, the user
  still gets the full 3 minutes after the warning.
- Checking in, cancelling or extending during the grace period stops it. After extending, the walk
  is warned again only when the new deadline passes; it can never become overdue on an old
  warning.
- A walk is warned once per deadline and becomes overdue once. An overdue walk can still be checked
  in (`0004_check_in.sql`).

The grace period:

- It is 3 minutes, decided by the group on 26 Oct after testing on real phones
  (`0017_three_minute_grace.sql`). Before that it was 5 minutes, from the 05:00 on the SCRUM-72
  prototype. It is in three places that must match: `grace_period` in
  `0017_three_minute_grace.sql`, `GRACE_MINUTES` in `src/features/walk/grace.ts` (the countdown)
  and `GRACE_MINUTES` in `supabase/functions/send-walk-push/walkPush.ts` (the words of "Are you
  OK?").
- Assumption: the check runs every minute, so the warning can come up to a minute after the
  deadline, and the alert up to a minute after the 3 minutes.

The free Supabase plan pauses a project after a week without activity. While it is paused the
check does not run, and nobody is warned or alerted.

To set it up, after "Sending push" works: deploy `send-walk-push` again (it now knows `are_you_ok`),
then run `0011_late_walks.sql`. If the SQL Editor says pg_cron is not available, turn it on under
**Database > Extensions** first. **Integrations > Cron** then shows the job `check-late-walks` and
each run. The rules are tested by `supabase/tests/late_walks_test.sql` (see "Testing the database").

For the alert (SCRUM-74): deploy `send-walk-push` again (it now knows `overdue`), then run
`0012_overdue_alert.sql`. Tested by `supabase/tests/overdue_alert_test.sql`.

For the 3-minute grace period: run `0017_three_minute_grace.sql` and deploy `send-walk-push` again,
so "Are you OK?" says 3 minutes too. Tested by `supabase/tests/late_walks_test.sql`.

### The contact's view

Tapping the alert opens screen 10 of the SCRUM-72 prototype for the contact (SCRUM-102,
`src/features/followedWalk/`): whose walk it is, "Check-in overdue" with the due time, and the last
known location on a map with the time it was saved, under the line "This is the last shared
location, not a live position." When the walker checks in, the screen changes to "Anna is safe" by
itself: it asks the server again as soon as a push arrives, and every 30 seconds while the walk
is on the way or overdue.

Every message to a contact opens this screen, not only the alert: "is on the way home" shows the
due time without a location, "has arrived safely" and "stopped the walk" show how the walk ended.
Before 26 Oct only the alert had a link, so tapping the others only brought the app to the front.

**"I'm watching" (SCRUM-114).** While the walk is on the way, the contact's screen has a button
"I'm watching". Tapping it calls `watch_walk` (`0019_im_watching.sql`), which saves the moment in
`walk_contacts.watching_at`, only for a contact on that walk who accepted and is not paused, and
only while the walk is `active`. The walker's walk screen then shows "Mum is watching your walk"
(`fetchWalkWatchers`, asked every 30 seconds, when the app comes back on screen and when a push
arrives). `followed_walk` also says whether this contact already tapped, so the button does not come
back after reopening the app. From the Studio Krom feedback: choosing contacts without any sign from
their side may not be enough for the walker to feel someone is looking out. The walker gets no push
message for it, to keep the walk quiet; they see it on the walk screen.

What a contact may see comes from one database function, `followed_walk` (`0013_contact_walk_view.sql`):

- Only a contact who was added to this walk, accepted, and is not paused. Anyone else gets "This
  walk is not shared with you", also for a walk that does not exist.
- The location only while the walk is overdue. Before that the contact sees only "on the way, home
  by 22:36"; after the check-in only "safe", because the check-in erases the location.
- Never the destination, the start time or the route. Decided on 25 Oct: a typed destination can be
  a home address. The design shows "Destination: Home"; that line is left out.

Jira asked for "an RLS rule". A row policy would open the whole walk row, destination included, so
a function that returns only these fields is used instead, like `get_invite` for invites.

The `?walk=<id>` part of the link is kept in the browser tab (`sessionStorage`) while the contact
signs in, because signing in with Google loses it. Back closes the screen and forgets it.

The Activity feed on the Contacts tab is the second way in (SCRUM-104, SCRUM-115, screen 09).
One card per person the user looks out for, with their latest walk: "Anna hasn't checked in · View
walk", "Anna started a walk · Check-in due at 22:26", "Anna arrived safely" or "Anna stopped the
walk", each with its time. Tapping a card opens the same screen. The feed asks again as soon as a
push arrives, every 30 seconds and when the app comes back on screen, so it changes by itself. The
design's "Home · Expected arrival" and "Her …" are left out: the destination is not shared, and
the app does not know anyone's pronouns.

The walks come from `followed_walk_statuses` (`0016`, with `started_at` added in
`0018_walk_start_for_activity.sql` for "started a walk"), with the
same rule as `followed_walk`: the walk, the walker's name, the status and its times, never a
location. One walk per person: an overdue one first, otherwise the newest. Walks on the way and
overdue walks always show; an ended walk for 12 hours (assumption, to confirm in SCRUM-115). It
replaces `overdue_followed_walks` from 0015, which only knew overdue walks. If the contact removed
the walker from their own list, they still follow the walks they were added to, so an overdue walk
of such a person shows in the feed too. An overdue walk stays in the feed until the walker
checks in.

"Call" and "Message" from the design are left out: the app has no phone numbers. The map only
covers Eindhoven; a last location outside it is shown as coordinates instead.

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
  and either side can end it. Accepting makes the link two-way (decided on 26 Oct), so by
  accepting, the contact also shares their own walks with the person who invited them; the accept
  screen says this before the tap.
- **Invite links:** only a fingerprint of the link is stored, it works for 48 hours, and it is
  erased when the invite is accepted.
- **Push subscriptions:** per phone we store only the push service address and its two keys. No
  device name, browser or IP address. The row is deleted when notifications are turned off on that
  phone, and with the account.
- **Contacts reading a walk:** the first and only time someone other than the owner reads walk
  data (SCRUM-102). A contact who was added to the walk, accepted and is not paused sees the
  walker's name, the status, the due time and the check-in or cancel time. The last known location
  only while the walk is overdue, and so for at most 24 hours. Never the destination or the
  route. The Activity feed gets the same fields as the walk screen plus the start time (which the
  "is on the way home" message already tells), without the location. See "The contact's view".
- **"I'm watching":** only the moment the contact tapped is stored, on their link to that walk, and
  it goes with the walk. The walker sees who tapped; the contact learns nothing new (SCRUM-114).
- **Can a contact get alerts:** the user learns only yes or no per contact who accepted (SCRUM-103),
  never which phone or browser. Accepting an invite already lets the other person rely on you for
  alerts, so whether you can get them is part of that.
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

| File                                      | Tests                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `late_walks_test.sql`                     | The warning, the grace period and overdue (SCRUM-73)                        |
| `overdue_alert_test.sql`                  | The alert, "is safe" afterwards, erasing the location after 24 h (SCRUM-74) |
| `contact_walk_view_test.sql`              | Who may see a walk, and the location only while overdue (SCRUM-102)         |
| `mutual_contacts_test.sql`                | Accepting links both ways; an existing link back is kept (SCRUM-60)         |
| `overdue_followed_walks_test.sql`         | Which overdue walks show on the Contacts tab (SCRUM-104)                    |
| `contact_alerts_and_walk_status_test.sql` | Alert yes or no, and the walk status per contact (SCRUM-103, SCRUM-115)     |
| `im_watching_test.sql`                    | Who may tap "I'm watching", and when (SCRUM-114)                            |

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
