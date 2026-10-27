// SCRUM-69: sends a push notification about a walk.
//
// Runs on Supabase as an Edge Function (Deno, not Node). The database calls it by itself when a
// walk starts, is checked in or is cancelled (trigger in supabase/migrations/0009_walk_push.sql),
// so it also works when the phone is locked or the app was closed right after the tap. Those
// messages go to the walk's contacts. The scheduled check for late walks (SCRUM-73,
// 0011_late_walks.sql) calls it too, for the "Are you OK?" warning to the walker, and the walk
// becoming overdue sends the alert to the contacts (SCRUM-74, 0012_overdue_alert.sql).
//
// Deployed by hand in the Supabase dashboard; steps in docs/backend.md, "Sending push". Vitest does
// not run this file. The rules it uses (who gets a message, what it says) are in
// ./walkPush.ts and are tested there.
//
// Decided on 24 Oct: web-push signs and encrypts the message. It is imported here with npm:, so it
// runs only on the server and is not part of the app or its package.json.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'
import {
  audienceOf,
  isSubscriptionGone,
  isWalkEvent,
  isReminderCurrent,
  messageFor,
  recipientsOf,
  timeToLive,
} from './walkPush.ts'

// All values come from Edge Function secrets. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are added
// by Supabase itself; the others are set once (docs/backend.md). Never write them in this file.
function secret(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Edge Function secret ${name} is missing. See docs/backend.md.`)
  return value
}

webpush.setVapidDetails(
  // The push services want a way to reach whoever sends the messages: a mailto: address.
  secret('VAPID_SUBJECT'),
  secret('VAPID_PUBLIC_KEY'),
  secret('VAPID_PRIVATE_KEY'),
)

// The service role key skips row level security. That is needed here: the function reads other
// users' contacts and phones. It stays on the server and never reaches the app.
const database = createClient(secret('SUPABASE_URL'), secret('SUPABASE_SERVICE_ROLE_KEY'))

/** The accounts of the walk's contacts who should hear about it. */
async function contactsOf(walkId: string): Promise<string[]> {
  // The contacts chosen for this walk, with their current status: someone paused during the walk
  // still has a row in walk_contacts.
  const { data: links, error } = await database
    .from('walk_contacts')
    .select('contacts(contact_user_id, status)')
    .eq('walk_id', walkId)
  if (error) throw error
  return recipientsOf(
    links.map((link) => ({
      contactUserId: link.contacts.contact_user_id,
      status: link.contacts.status,
    })),
  )
}

async function sendWalkPush(request: Request): Promise<Response> {
  // Only the database knows this secret. Without it anyone could make phones buzz.
  if (request.headers.get('x-walk-push-secret') !== secret('WALK_PUSH_SECRET')) {
    return new Response('Forbidden', { status: 403 })
  }

  const { walk_id: walkId, event, deadline: queuedDeadline } = await request.json()
  if (typeof walkId !== 'string' || !isWalkEvent(event)) {
    return new Response('Expected { walk_id, event }', { status: 400 })
  }

  const { data: walk, error: walkError } = await database
    .from('walks')
    // Only the time of the last location, never the place: the message does not carry it.
    .select('user_id, status, deadline, checked_in_at, cancelled_at, overdue_at, last_location_at')
    .eq('id', walkId)
    .single()
  if (walkError) return new Response(walkError.message, { status: 404 })

  // The walker checked in or cancelled just before this message went out: no warning needed.
  if (event === 'are_you_ok' && walk.status !== 'active') {
    return Response.json({ sent: 0, failed: 0, removed: 0 })
  }

  // SCRUM-64: the cron job may have queued this before an extension or check-in.
  if (
    event === 'reminder' &&
    !isReminderCurrent(walk.status, new Date(walk.deadline), queuedDeadline, new Date())
  ) {
    return Response.json({ sent: 0, failed: 0, removed: 0 })
  }

  const { data: profile } = await database
    .from('profiles')
    .select('display_name')
    .eq('id', walk.user_id)
    .single()

  const recipients =
    audienceOf(event) === 'walker' ? [walk.user_id as string] : await contactsOf(walkId)
  if (recipients.length === 0) return Response.json({ sent: 0, failed: 0, removed: 0 })

  const { data: phones, error: phonesError } = await database
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', recipients)
  if (phonesError) return new Response(phonesError.message, { status: 500 })

  const toDate = (value: string | null) => (value ? new Date(value) : null)
  const message = messageFor(event, profile?.display_name ?? null, {
    id: walkId,
    deadline: new Date(walk.deadline),
    checkedInAt: toDate(walk.checked_in_at),
    cancelledAt: toDate(walk.cancelled_at),
    overdueAt: toDate(walk.overdue_at),
    lastLocationAt: toDate(walk.last_location_at),
  })

  // Do not keep a reminder in the push service after the deadline. The deadline may have
  // passed while subscriptions were loaded, so skip it when there is no useful lifetime left.
  const ttl = timeToLive(event, new Date(walk.deadline))
  if (event === 'reminder' && ttl === 0) return Response.json({ sent: 0, failed: 0, removed: 0 })

  const results = await Promise.allSettled(
    phones.map((phone) =>
      webpush.sendNotification(
        { endpoint: phone.endpoint, keys: { p256dh: phone.p256dh, auth: phone.auth } },
        JSON.stringify(message),
        { TTL: ttl },
      ),
    ),
  )

  // Phones that removed the app or blocked notifications: their rows are of no use any more.
  const goneIds = phones
    .filter((_, index) => {
      const result = results[index]
      return result.status === 'rejected' && isSubscriptionGone(result.reason?.statusCode)
    })
    .map((phone) => phone.id)
  if (goneIds.length > 0) await database.from('push_subscriptions').delete().in('id', goneIds)

  const failed = results.filter((result) => result.status === 'rejected').length
  return Response.json({ sent: results.length - failed, failed, removed: goneIds.length })
}

Deno.serve(async (request) => {
  try {
    return await sendWalkPush(request)
  } catch (error) {
    // Answer with the reason, so `select * from net._http_response` in the SQL Editor shows what
    // went wrong (for example "Edge Function secret WALK_PUSH_SECRET is missing") instead of a bare
    // "Internal Server Error". Our own messages never contain a secret's value.
    const reason = error instanceof Error ? error.message : String(error)
    console.error(error)
    return Response.json({ error: reason }, { status: 500 })
  }
})
