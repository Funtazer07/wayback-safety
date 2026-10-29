// Who hears about a walk, and what the push message says. No Deno imports, so Vitest can test it.
// It stays next to index.ts because the Supabase dashboard editor cannot import from other folders.

export type WalkEvent =
  | 'started'
  | 'home_safe'
  | 'cancelled'
  | 'are_you_ok'
  | 'overdue'
  | 'reminder'
  | 'deadline_extended'

const walkEvents: WalkEvent[] = [
  'started',
  'home_safe',
  'cancelled',
  'are_you_ok',
  'overdue',
  'reminder',
  'deadline_extended',
]

/** Must match grace_period in 0017_three_minute_grace.sql. */
export const GRACE_MINUTES = 3

/** url is relative to the app; without it, tapping opens the start page. */
export type PushMessage = { title: string; body: string; url?: string }

export type WalkFacts = {
  id: string
  deadline: Date
  checkedInAt: Date | null
  cancelledAt: Date | null
  overdueAt: Date | null
  lastLocationAt: Date | null
}

export type WalkContact = {
  contactUserId: string | null
  status: 'invited' | 'accepted' | 'paused'
}

export function isWalkEvent(value: unknown): value is WalkEvent {
  return walkEvents.includes(value as WalkEvent)
}

export function audienceOf(event: WalkEvent): 'walker' | 'contacts' {
  return event === 'are_you_ok' || event === 'reminder' ? 'walker' : 'contacts'
}

/**
 * Seconds the push service keeps trying a phone that is off. The alert lasts a day, as long as the
 * last location is kept. Assumption: an hour is enough for other walk news.
 */
export function timeToLive(event: WalkEvent, deadline?: Date, now = new Date()): number {
  if (event === 'reminder') {
    return deadline
      ? Math.max(0, Math.min(60, Math.floor((deadline.getTime() - now.getTime()) / 1000)))
      : 0
  }
  if (event === 'deadline_extended') {
    return deadline
      ? Math.max(0, Math.min(60 * 60, Math.floor((deadline.getTime() - now.getTime()) / 1000)))
      : 60 * 60
  }
  if (event === 'are_you_ok') return GRACE_MINUTES * 60
  if (event === 'overdue') return 24 * 60 * 60
  return 60 * 60
}

/** A contact paused during the walk stays linked to it, so paused contacts are filtered here. */
export function recipientsOf(contacts: WalkContact[]): string[] {
  const ids = contacts
    .filter((contact) => contact.status === 'accepted' && contact.contactUserId !== null)
    .map((contact) => contact.contactUserId as string)
  return [...new Set(ids)]
}

/** The server runs in UTC, so the time zone must be given. */
export function formatClock(time: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  }).format(time)
}

/**
 * Never includes the location: the app shows it, marked as last known and not live. No "her" or
 * "his": the app does not know anyone's pronouns.
 */
export function messageFor(
  event: WalkEvent,
  walkerName: string | null,
  walk: WalkFacts,
): PushMessage {
  const name = walkerName?.trim() || 'Your contact'
  const walkUrl = `?walk=${walk.id}`
  switch (event) {
    case 'started':
      return {
        title: `${name} is on the way home`,
        body: `Expected home at ${formatClock(walk.deadline)}.`,
        url: walkUrl,
      }
    case 'home_safe':
      // After an alert the contacts may already be searching.
      if (walk.overdueAt) {
        return {
          title: `${name} is safe`,
          body: `${name} checked in at ${formatClock(walk.checkedInAt ?? new Date())}, after the missed check-in alert. No need to look any further.`,
          url: walkUrl,
        }
      }
      return {
        title: `${name} has arrived safely`,
        body: `Checked in at ${formatClock(walk.checkedInAt ?? new Date())}.`,
        url: walkUrl,
      }
    case 'overdue':
      return {
        title: `${name} hasn't checked in yet`,
        body: [
          `${name} was expected home at ${formatClock(walk.deadline)} but hasn't confirmed arriving safely. This does not necessarily mean something is wrong.`,
          walk.lastLocationAt
            ? `Last known location from ${formatClock(walk.lastLocationAt)}, not live. Open WayBack to see it.`
            : 'No location was shared during this walk.',
        ].join(' '),
        url: walkUrl,
      }
    case 'cancelled':
      return {
        title: `${name} stopped the walk`,
        body: `Cancelled at ${formatClock(walk.cancelledAt ?? new Date())}. No check-in will follow.`,
        url: walkUrl,
      }
    case 'deadline_extended':
      return {
        title: `${name} updated the arrival time`,
        body: `${name} needs a little more time to get home. The new expected arrival time is ${formatClock(walk.deadline)}. No action is needed.`,
        url: walkUrl,
      }
    case 'reminder':
      return {
        title: 'Need more time?',
        body: `Your check-in is due at ${formatClock(walk.deadline)}. Open WayBack to add time or say you’re home.`,
        url: `?reminder=${encodeURIComponent(walk.id)}`,
      }
    case 'are_you_ok':
      return {
        title: 'Are you OK?',
        body: `Your timer has run out. Open WayBack to say you are home or add time. Otherwise your contacts are told in ${GRACE_MINUTES} minutes.`,
      }
  }
}

/** 404 or 410: the app was removed or notifications were turned off, so the row can go. */
export function isSubscriptionGone(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410
}

/** A queued reminder is stale after an extension, check-in, cancellation or expiry. */
export function isReminderCurrent(
  status: string,
  deadline: Date,
  queuedDeadline: unknown,
  now: Date,
): boolean {
  const remaining = deadline.getTime() - now.getTime()
  return (
    status === 'active' &&
    typeof queuedDeadline === 'string' &&
    new Date(queuedDeadline).getTime() === deadline.getTime() &&
    remaining > 0 &&
    remaining <= 60_000
  )
}
