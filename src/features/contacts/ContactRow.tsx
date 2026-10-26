import type { ContactWalk } from '../followedWalk/followedWalk.ts'
import type { Contact } from './contacts.ts'
import { contactStatusText, contactWalkText, initialOf } from './contactStatus.ts'

type ContactRowProps = {
  contact: Contact
  now: Date
  isSelected: boolean
  onSelect: () => void
  /** Their latest walk, when the user looks out for them and there is one (SCRUM-115). */
  walk?: ContactWalk
  onOpenWalk: (walkId: string) => void
}

/** One person on the Contacts tab: tap for their options, and their walk right under it. */
function ContactRow({ contact, now, isSelected, onSelect, walk, onOpenWalk }: ContactRowProps) {
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
      {walk && <WalkButton walk={walk} onClick={() => onOpenWalk(walk.walkId)} />}
    </li>
  )
}

/**
 * Opens the walk (SCRUM-102). An overdue walk stands out with a thick edge and a warm colour; the
 * words say it too, so the colour is never the only sign.
 */
function WalkButton({ walk, onClick }: { walk: ContactWalk; onClick: () => void }) {
  const className = walk.status === 'overdue' ? 'contacts-walk is-overdue' : 'contacts-walk'
  return (
    <button type="button" className={className} onClick={onClick}>
      {contactWalkText(walk)}
    </button>
  )
}

type OtherOverdueWalksProps = {
  /** Overdue walks of people who are not on the user's own list. */
  walks: ContactWalk[]
  onOpenWalk: (walkId: string) => void
}

/**
 * Someone who removed the walker from their own list still follows the walks they were added to.
 * Such a walk gets a line of its own when it is overdue, so a missed check-in is never hidden.
 */
export function OtherOverdueWalks({ walks, onOpenWalk }: OtherOverdueWalksProps) {
  if (walks.length === 0) return null

  return (
    <ul className="contacts-list" aria-label="Other overdue walks">
      {walks.map((walk) => (
        <li key={walk.walkId} className="contacts-item">
          <strong>{walk.walkerName}</strong>
          <WalkButton walk={walk} onClick={() => onOpenWalk(walk.walkId)} />
        </li>
      ))}
    </ul>
  )
}

export default ContactRow
