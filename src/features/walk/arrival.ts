import type { WalkContact } from './walk.ts'

export type ArrivalUpdate = {
  told: string[]
  /** Notifications are off, so they got nothing. */
  notReached: string[]
}

/** A contact whose alert status is unknown counts as told: the message was sent. */
export function arrivalUpdate(
  contacts: WalkContact[],
  canReceiveAlerts: Map<string, boolean>,
): ArrivalUpdate {
  const followers = contacts.filter((contact) => contact.status === 'accepted')
  return {
    told: followers
      .filter((contact) => canReceiveAlerts.get(contact.id) !== false)
      .map((contact) => contact.label),
    notReached: followers
      .filter((contact) => canReceiveAlerts.get(contact.id) === false)
      .map((contact) => contact.label),
  }
}
