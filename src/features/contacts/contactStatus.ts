import type { ContactWalk } from '../followedWalk/followedWalk.ts'
import { formatClock } from '../walk/time.ts'
import type { Contact } from './contacts.ts'

/**
 * The line under a contact's name on screen 14. Words, not only a colour. For someone who accepted
 * it says whether an alert can reach them (SCRUM-103): "Invitation accepted" alone told the user
 * nothing, and a contact without notifications gets no alert at all.
 */
export function contactStatusText(contact: Contact, now: Date): string {
  if (contact.status === 'accepted') {
    if (contact.canReceiveAlerts === true) return 'Can receive alerts'
    if (contact.canReceiveAlerts === false) return 'Notifications off: cannot receive alerts'
    return 'Invitation accepted'
  }
  if (contact.status === 'paused') return 'Updates paused'
  if (contact.inviteExpiresAt && contact.inviteExpiresAt.getTime() <= now.getTime()) {
    return 'Invitation expired'
  }
  return 'Invitation pending'
}

/**
 * What the latest walk of someone the user looks out for says on the Contacts tab (SCRUM-115).
 * Never where they are: the location is only on the walk screen, and only while overdue.
 */
export function contactWalkText(walk: ContactWalk): string {
  if (walk.status === 'overdue') return 'Check-in overdue · View walk'
  if (walk.status === 'active') return `On the way · home by ${formatClock(walk.deadline)}`
  if (walk.status === 'safe') return `Home safe${atTime(walk.checkedInAt)}`
  return `Stopped the walk${atTime(walk.cancelledAt)}`
}

// " at 22:31", or nothing. The database always saves these times; this is only a safety net.
function atTime(time: Date | null): string {
  return time ? ` at ${formatClock(time)}` : ''
}

/** The first letter of the name, for the round badge in front of it. */
export function initialOf(label: string): string {
  return label.trim().charAt(0).toUpperCase() || '?'
}
