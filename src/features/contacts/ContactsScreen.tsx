import { useState } from 'react'
import TopBar from '../../components/TopBar.tsx'
import ContactOptions from './ContactOptions.tsx'
import ContactRow from './ContactRow.tsx'
import InviteSheet from './InviteSheet.tsx'
import { useContacts } from './useContacts.ts'
import './contacts.css'

type ContactsScreenProps = {
  userId: string
  /** The user's own name, put in the invite text: "Anna would like you as a trusted contact". */
  displayName: string
  /** Back to the Activity feed (screen 09), where this screen is opened from. */
  onBack: () => void
}

/**
 * Screen 14 of the prototype: the user's trusted contacts, and inviting a new one (SCRUM-60).
 * Opened from Activity. Their walks are shown there, not here.
 */
function ContactsScreen({ userId, displayName, onBack }: ContactsScreenProps) {
  const { contacts, isLoading, error, invite, pause, remove } = useContacts(userId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  // Read once: whether an invite has expired does not need to change while the screen is open.
  const [now] = useState(() => new Date())
  const selected = contacts.find((contact) => contact.id === selectedId) ?? null

  return (
    <main className="screen">
      <TopBar title="Your circle" onBack={onBack} />
      <div>
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

      <ul className="contacts-list" aria-label="Your trusted contacts">
        {contacts.map((contact) => (
          <ContactRow
            key={contact.id}
            contact={contact}
            now={now}
            isSelected={contact.id === selectedId}
            onSelect={() => setSelectedId(contact.id === selectedId ? null : contact.id)}
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
