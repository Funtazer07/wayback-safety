import { useState } from 'react'
import { useContactWalks } from '../followedWalk/useContactWalks.ts'
import NotificationCard from '../notifications/NotificationCard.tsx'
import ContactOptions from './ContactOptions.tsx'
import ContactRow, { OtherOverdueWalks } from './ContactRow.tsx'
import InviteSheet from './InviteSheet.tsx'
import { useContacts } from './useContacts.ts'
import './contacts.css'

type ContactsScreenProps = {
  userId: string
  /** The user's own name, put in the invite text: "Anna would like you as a trusted contact". */
  displayName: string
  /** Opens the walk of someone the user looks out for (SCRUM-104, SCRUM-115). */
  onOpenWalk: (walkId: string) => void
}

/** Screen 14 of the prototype: the user's trusted contacts, and inviting a new one (SCRUM-60). */
function ContactsScreen({ userId, displayName, onOpenWalk }: ContactsScreenProps) {
  const { contacts, isLoading, error, invite, pause, remove } = useContacts(userId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  // Read once: whether an invite has expired does not need to change while the screen is open.
  const [now] = useState(() => new Date())
  const selected = contacts.find((contact) => contact.id === selectedId) ?? null
  const walks = useContactWalks()
  // Wait for the contacts, or every walk would look like it has no row yet.
  const otherOverdueWalks = isLoading
    ? []
    : walks.filter(
        (walk) =>
          walk.status === 'overdue' && !contacts.some((contact) => contact.id === walk.contactId),
      )

  return (
    <main className="screen">
      <div>
        <p className="contacts-small">Your circle</p>
        <h1>Trusted contacts</h1>
        <p className="contacts-small">Choose who hears about each walk.</p>
      </div>

      {isLoading && <p>Loading…</p>}
      {error && <p role="alert">{error} Check your connection and try again.</p>}
      {!isLoading && !error && contacts.length === 0 && (
        <p className="contacts-empty">
          No contacts yet. Invite someone you trust. Once they accept, you look out for each other:
          you both hear when the other starts a walk, gets home or misses a check-in.
        </p>
      )}

      <OtherOverdueWalks walks={otherOverdueWalks} onOpenWalk={onOpenWalk} />

      <ul className="contacts-list" aria-label="Your trusted contacts">
        {contacts.map((contact) => (
          <ContactRow
            key={contact.id}
            contact={contact}
            now={now}
            isSelected={contact.id === selectedId}
            onSelect={() => setSelectedId(contact.id === selectedId ? null : contact.id)}
            walk={walks.find((walk) => walk.contactId === contact.id)}
            onOpenWalk={onOpenWalk}
          />
        ))}
      </ul>

      {selected && (
        <ContactOptions
          key={selected.id}
          contact={selected}
          onPause={(isPaused) => pause(selected.id, isPaused)}
          onRemove={async () => {
            await remove(selected.id)
            setSelectedId(null)
          }}
        />
      )}

      {/* For someone who looks out for others but never starts a walk, this is the place to turn
          notifications on: the other card is on Start a walk. It hides itself once they are on. */}
      {contacts.some((contact) => contact.status !== 'invited') && (
        <NotificationCard reason="WayBack can then tell you when your contacts start a walk, get home or miss a check-in, also when your phone is locked." />
      )}

      <div className="screen-actions">
        <p className="contacts-small">
          An invitation must be accepted before alerts or walk updates are shared.
        </p>
        <button type="button" className="button-primary" onClick={() => setIsInviting(true)}>
          Invite by link or email
        </button>
      </div>

      {isInviting && (
        <InviteSheet
          displayName={displayName}
          onInvite={invite}
          onClose={() => setIsInviting(false)}
        />
      )}
    </main>
  )
}

export default ContactsScreen
