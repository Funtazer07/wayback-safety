# SCRUM-62 / SCRUM-64: review the time before it runs out

## What changes

The active walk shows a reminder in the last minute. The existing five-minute timer colour warning stays unchanged. “Review check-in time” opens the existing
“Running late?” sheet, with a suggested +10 minutes and +5 / +10 / +15 choices. Nothing changes
until the walker confirms an amount and the existing server function accepts it. Failed requests
stay on the sheet with a retry message. “Keep my time” leaves the deadline unchanged.

The existing cancellation confirmation, check-in, arrival prompts and grace-period behaviour are
reused. They are not replaced. The route-based “Running late?” prompt takes priority over the
manual review, and arrival takes priority over both.

## Timing decision

The user requested **1 minute before the deadline** on 27 October 2026. The database now checks
every 10 seconds, so normally a reminder is queued with 50–60 seconds remaining, plus delivery
time. A minute-based job could miss most of this short response window. This is separate from
the timer's five-minute colour warning and the existing three-minute grace period after expiry.
The app never extends time automatically. Expired walks are skipped.

## Locked-phone flow

The database job uses the same Edge Function, subscriptions and VAPID keys as SCRUM-7. It sends to
the walker, never to their contacts. No location or destination is included:

> Need more time?
>
> Your check-in is due at 22:26. Open WayBack to add time or say you’re home.

Tapping the push opens `?reminder=<walk id>`. The app loads the current walk from the server and
opens its time review. A link for a different walk cannot open that review. If the deadline has
already passed, the existing “Are you okay?” screen takes priority. Notification buttons cannot
be relied on across iPhone and Android, so the notification opens the authenticated app instead
of silently changing time from the lock screen.

The Edge Function checks the status and exact queued deadline again before sending. An expired,
extended, checked-in or cancelled walk does not receive that queued reminder. Push TTL is capped
at 60 seconds and the remaining seconds, so an offline phone is not offered an extension from this reminder
after its deadline. A push already accepted by the phone cannot be recalled; opening it always
uses the current server state.

`reminder_deadline` records a **queued** request, not delivery. Repeated or overlapping jobs queue
one request per deadline. A changed deadline becomes eligible again. Missing configuration or a
queue exception leaves it eligible to retry. Delivery failure after pg_net accepts a request is
visible in its response log; this change does not add a delivery retry queue. Push is best effort:
permission, connectivity, OS settings and the existing push setup must allow it.

## Design and research

The source is [Figma screen 13 — Extend or cancel](https://www.figma.com/design/VD6H7JjqSAZBMdxv2Deb8Y/Wayback-prototype?node-id=52-243).
The prototype reuses the product's existing mint surfaces, green actions and white cards.
SCRUM-62's Jira comment quotes Studio Krom's advice to suggest a time adjustment, while never
automatically moving the deadline. The design and implementation follow that distinction.
SCRUM-45 and SCRUM-49 have no test-result comments in Jira. SCRUM-62 links a usability PDF, but
it could not be downloaded in this environment. No additional usability findings are claimed.

## View the interactive prototype

From this branch's project folder:

```sh
npm ci
npx vite --config walk-reminder-preview.config.ts --host 0.0.0.0
```

Open the terminal's address followed by `walk-reminder-preview.html`. The preview offers walk,
extension, cancellation and illustrative lock-screen states. It uses no account, location or
backend, and clearly labels all actions as demo actions. It does not prove real push delivery.
On a phone, use the computer's LAN address on the same Wi-Fi. Real PWA push needs HTTPS and an
installed app on iPhone; plain LAN HTTP is only suitable for this visual prototype.

## Deploy after review

1. Redeploy `supabase/functions/send-walk-push/index.ts` and `walkPush.ts` together. Keep the
   existing secrets and Verify JWT setting described in `docs/backend.md`.
2. Apply `0020_walk_reminders.sql` and then `0021_one_minute_walk_reminder.sql` after migrations
   0001–0019 on a new environment. Both are already applied on the shared project; do not rerun them.
3. Deploy the app through the team's normal GitHub workflow after merging the reviewed branch.
4. In a test database, apply 0021, then run `supabase/tests/walk_reminders_test.sql`; it rolls back its fixtures.
5. On a real installed phone with notifications enabled, start a short walk and lock the phone.
   Confirm one reminder arrives, opens the time review and only a confirmed amount changes the
   server deadline. Test check-in, cancellation, extension and no-network cases too.

## Deployment status — 27 October 2026

With the user's authorization, the existing `send-walk-push` Edge Function was updated in
project `pfosqttovimhrfswhkeh`, and migration 0020 was applied in a transaction. Do not run 0020
again on this project. Existing message types, VAPID secrets and JWT settings were preserved.

Verified in the dashboard:

- The rollback-only SQL tests returned `ALL CHECKS PASSED`.
- `check-walk-reminders` is active every 10 seconds and its latest run succeeded.
- The real pg_net queue helper was restored after the test transaction rolled back.
- An intentionally incomplete notification-free request reached the Edge Function and returned
  its expected validation response, confirming runtime startup and the shared-secret connection.

The user confirmed receipt on the computer and then confirmed that notifications also work
on the locked screen on 27 October 2026. This is a user-reported device check, not an automated
end-to-end test. The frontend changes remain local on `SCRUM-64-timer-reminder`;
they have not been merged into main or deployed to GitHub Pages. The existing live walk screen
already offers extension buttons; automatically opening the time-review sheet from the reminder
requires deploying this branch's frontend.

### Timing update — 27 October 2026

Migration `0021_one_minute_walk_reminder.sql` changes the eligibility window to one minute and
reschedules the existing job to `10 seconds`; it does not create a duplicate job. Running walks
have their old five-minute queue marker cleared once so they can receive the new reminder.
The deployed Edge Function uses the same one-minute eligibility and caps push TTL at 60 seconds.
The server continues to send while the phone is locked; final lock-screen delivery depends on
notification permission, connectivity and OS delivery. The user subsequently confirmed locked-screen delivery.

Migration 0021 and the one-minute Edge Function update were applied on 27 October 2026.
The updated rollback-only SQL tests returned `ALL CHECKS PASSED`. The live job was verified as
`10 seconds`, active, with its latest run `succeeded`; the one-minute function and real push queue
were both confirmed after the tests. The 55 focused client/server logic tests passed locally.
