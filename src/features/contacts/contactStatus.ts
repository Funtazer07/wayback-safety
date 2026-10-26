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

/** The first letter of the name, for the round badge in front of it. */
export function initialOf(label: string): string {
  return label.trim().charAt(0).toUpperCase() || '?'
}
