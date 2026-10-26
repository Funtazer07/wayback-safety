import type { OverdueWalk } from '../followedWalk/followedWalk.ts'
import type { Contact } from './contacts.ts'
import { contactStatusText, initialOf } from './contactStatus.ts'

type ContactRowProps = {
  contact: Contact
  now: Date
  isSelected: boolean
  onSelect: () => void
  /** Set when this contact's walk is overdue (SCRUM-104): opens that walk. */
  onOpenOverdueWalk?: () => void
}

/** One person on the Contacts tab: tap for their options, and a way into an overdue walk. */
function ContactRow({ contact, now, isSelected, onSelect, onOpenOverdueWalk }: ContactRowProps) {
  return (
    <li className="contacts-item">
      <button type="button" className="contacts-row" aria-pressed={isSelected} onClick={onSelect}>
        <span className="contacts-initial" aria-hidden="true">
          {initialOf(contact.label)}
        </span>
        <span>
          <strong>{contact.label}</strong>
          <span className="contacts-small">{contactStatusText(contact, now)}</span>
        </span>
      </button>
      {onOpenOverdueWalk && <OverdueWalkButton onClick={onOpenOverdueWalk} />}
    </li>
  )
}

/** The words say it is overdue, so the colour is never the only sign. */
function OverdueWalkButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="contacts-overdue" onClick={onClick}>
      Check-in overdue · View walk
    </button>
  )
}

type OtherOverdueWalksProps = {
  /** Overdue walks of people who are not on the user's own list. */
  walks: OverdueWalk[]
  onOpenWalk: (walkId: string) => void
}

/**
 * Someone who removed the walker from their own list still follows the walks they were added to.
 * Such a walk gets a line of its own, so a missed check-in is never hidden.
 */
export function OtherOverdueWalks({ walks, onOpenWalk }: OtherOverdueWalksProps) {
  if (walks.length === 0) return null

  return (
    <ul className="contacts-list" aria-label="Other overdue walks">
      {walks.map((walk) => (
        <li key={walk.walkId} className="contacts-item">
          <strong>{walk.walkerName}</strong>
          <OverdueWalkButton onClick={() => onOpenWalk(walk.walkId)} />
        </li>
      ))}
    </ul>
  )
}

export default ContactRow
