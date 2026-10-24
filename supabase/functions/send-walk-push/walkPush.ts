// SCRUM-69: who hears about a walk, and what the push message says.
//
// Plain TypeScript without Deno or npm imports, so the app's tests (Vitest) can check it. The Edge
// Function in ./index.ts does the database and sending work around it. It sits in the same folder
// on purpose: the Supabase dashboard editor cannot import files from another folder.

/**
 * What happened to a walk.
 * - started:   the walk began (SCRUM-7).
 * - home_safe: the user checked in (SCRUM-7, SCRUM-48).
 * - cancelled: the user stopped the walk without a check-in (SCRUM-12, SCRUM-63). Added here on
 *   24 Oct: SCRUM-63 and SCRUM-12 promise it, but no other subtask builds it.
 * SCRUM-73 and SCRUM-74 add their own events here ("Are you OK?", the alert).
 */
export type WalkEvent = 'started' | 'home_safe' | 'cancelled'

const walkEvents: WalkEvent[] = ['started', 'home_safe', 'cancelled']

/** What the service worker (public/push-sw.js) shows. */
export type PushMessage = { title: string; body: string }

/** A contact linked to the walk, as stored in the contacts table (0005_contacts.sql). */
export type WalkContact = {
  contactUserId: string | null
  status: 'invited' | 'accepted' | 'paused'
}

export function isWalkEvent(value: unknown): value is WalkEvent {
  return walkEvents.includes(value as WalkEvent)
}

/**
 * The accounts that get a message: contacts who accepted and are not paused. A contact paused
 * during the walk stays linked to it, so they are filtered out here (see docs/backend.md).
 */
export function recipientsOf(contacts: WalkContact[]): string[] {
  const ids = contacts
    .filter((contact) => contact.status === 'accepted' && contact.contactUserId !== null)
    .map((contact) => contact.contactUserId as string)
  return [...new Set(ids)]
}

/** "22:36", in Eindhoven's time zone. The server runs in UTC, so the zone must be given. */
export function formatClock(time: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  }).format(time)
}

/**
 * The message for an event. Short and calm, and never a location (SCRUM-67). The wording follows
 * the SCRUM-67 prototype without "her" or "his": the app does not know anyone's pronouns.
 */
export function messageFor(
  event: WalkEvent,
  walkerName: string | null,
  walk: { deadline: Date; checkedInAt: Date | null; cancelledAt: Date | null },
): PushMessage {
  // Every user picks a name in onboarding, but the server should not crash on an old account.
  const name = walkerName?.trim() || 'Your contact'
  switch (event) {
    case 'started':
      return {
        title: `${name} is on the way home`,
        body: `Expected home at ${formatClock(walk.deadline)}.`,
      }
    case 'home_safe':
      return {
        title: `${name} has arrived safely`,
        body: `Checked in at ${formatClock(walk.checkedInAt ?? new Date())}.`,
      }
    case 'cancelled':
      // The second sentence matters: without it a contact may wait for a check-in that never comes
      // and start to worry.
      return {
        title: `${name} stopped the walk`,
        body: `Cancelled at ${formatClock(walk.cancelledAt ?? new Date())}. No check-in will follow.`,
      }
  }
}

/**
 * The push service answers 404 or 410 when a phone's subscription no longer exists (the app was
 * removed, or notifications were turned off in the phone's settings). That row can be deleted.
 */
export function isSubscriptionGone(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410
}
