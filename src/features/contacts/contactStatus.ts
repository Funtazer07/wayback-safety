import type { Contact } from './contacts.ts'

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

export function initialOf(label: string): string {
  return label.trim().charAt(0).toUpperCase() || '?'
}
