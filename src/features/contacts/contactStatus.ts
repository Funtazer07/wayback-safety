import type { Contact } from './contacts.ts'

/**
 * The line under a contact's name on screen 14. Words, not only a colour: "Invitation accepted",
 * "Invitation pending", "Invitation expired" or "Updates paused".
 */
export function contactStatusText(contact: Contact, now: Date): string {
  if (contact.status === 'accepted') return 'Invitation accepted'
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
