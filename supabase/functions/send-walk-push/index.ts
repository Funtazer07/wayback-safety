// Edge Function (Deno) that sends a push about a walk. Database triggers call it, so it works even
// when the walker's phone is locked. Deployed by hand: see docs/backend.md, "Sending push".
// The rules live in ./walkPush.ts, which is tested.

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

function secret(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Edge Function secret ${name} is missing. See docs/backend.md.`)
  return value
}

webpush.setVapidDetails(
  secret('VAPID_SUBJECT'),
  secret('VAPID_PUBLIC_KEY'),
  secret('VAPID_PRIVATE_KEY'),
)

// Skips row level security to read other users' contacts and phones. Server only.
const database = createClient(secret('SUPABASE_URL'), secret('SUPABASE_SERVICE_ROLE_KEY'))

async function contactsOf(walkId: string): Promise<string[]> {
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
  if (request.headers.get('x-walk-push-secret') !== secret('WALK_PUSH_SECRET')) {
    return new Response('Forbidden', { status: 403 })
  }

  const { walk_id: walkId, event, deadline: queuedDeadline } = await request.json()
  if (typeof walkId !== 'string' || !isWalkEvent(event)) {
    return new Response('Expected { walk_id, event }', { status: 400 })
  }

  const { data: walk, error: walkError } = await database
    .from('walks')
    .select('user_id, status, deadline, checked_in_at, cancelled_at, overdue_at, last_location_at')
    .eq('id', walkId)
    .single()
  if (walkError) return new Response(walkError.message, { status: 404 })

  // The walk ended before this went out, so the message is no longer true.
  if ((event === 'are_you_ok' || event === 'deadline_extended') && walk.status !== 'active') {
    return Response.json({ sent: 0, failed: 0, removed: 0 })
  }

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

  // The deadline may have passed while the phones were loading.
  const ttl = timeToLive(event, new Date(walk.deadline))
  if ((event === 'reminder' || event === 'deadline_extended') && ttl === 0)
    return Response.json({ sent: 0, failed: 0, removed: 0 })

  const results = await Promise.allSettled(
    phones.map((phone) =>
      webpush.sendNotification(
        { endpoint: phone.endpoint, keys: { p256dh: phone.p256dh, auth: phone.auth } },
        JSON.stringify(message),
        { TTL: ttl },
      ),
    ),
  )

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
    // The reason shows up in net._http_response, which helps debugging. It never holds a secret.
    const reason = error instanceof Error ? error.message : String(error)
    console.error(error)
    return Response.json({ error: reason }, { status: 500 })
  }
})
