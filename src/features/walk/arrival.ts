import type { WalkContact } from './walk.ts'

/** Who heard that the user got home, for the "You're home" screen (SCRUM-106). */
export type ArrivalUpdate = {
  /** Contacts the safe-arrival message was sent to. */
  told: string[]
  /** Contacts who follow the walk but have notifications off, so they got nothing. */
  notReached: string[]
}

/**
 * Splits the contacts of a walk by whether the safe-arrival message could reach them. The Edge
 * Function only sends to contacts who accepted and are not paused (recipientsOf in walkPush.ts),
 * and only phones with notifications on can get it (SCRUM-103). When the alert status is not
 * known for a contact, they are counted as told: the message was sent, we just cannot see more.
 */
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
