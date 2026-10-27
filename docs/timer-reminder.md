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

## Design

The source is [Figma screen 13 — Extend or cancel](https://www.figma.com/design/VD6H7JjqSAZBMdxv2Deb8Y/Wayback-prototype?node-id=52-243).
SCRUM-62's Jira comment quotes Studio Krom's advice to suggest a time adjustment, but never to
move the deadline automatically. The reminder follows that: it only opens the time review.

## Deploy

1. Redeploy `supabase/functions/send-walk-push/index.ts` and `walkPush.ts` together. Keep the
   existing secrets and Verify JWT setting described in `docs/backend.md`.
2. Run `0020_walk_reminders.sql` and then `0021_one_minute_walk_reminder.sql`.
3. In a test database, run `supabase/tests/walk_reminders_test.sql`; it rolls back its fixtures.
4. On a real installed phone with notifications on, start a short walk and lock the phone.
   Check that one reminder arrives, opens the time review, and that only a confirmed amount
   changes the deadline. Test check-in, cancellation, extension and no network too.

**Status on 27 October 2026:** steps 1 and 2 are done on the shared Supabase project. Do not run
0020 or 0021 again there. The `check-walk-reminders` job runs every 10 seconds, and the reminder
was received on a locked phone. The app side (the reminder in the walk screen and opening the
time review from the push) goes live when this branch is merged.
