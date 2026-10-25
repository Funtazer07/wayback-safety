import { useState } from 'react'
import ContactOptions from './ContactOptions.tsx'
import { contactStatusText, initialOf } from './contactStatus.ts'
import InviteSheet from './InviteSheet.tsx'
import { useContacts } from './useContacts.ts'
import './contacts.css'

type ContactsScreenProps = {
  userId: string
  /** The user's own name, put in the invite text: "Anna would like you as a trusted contact". */
  displayName: string
}

/** Screen 14 of the prototype: the user's trusted contacts, and inviting a new one (SCRUM-60). */
function ContactsScreen({ userId, displayName }: ContactsScreenProps) {
  const { contacts, isLoading, error, invite, pause, remove } = useContacts(userId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  // Read once: whether an invite has expired does not need to change while the screen is open.
  const [now] = useState(() => new Date())
  const selected = contacts.find((contact) => contact.id === selectedId) ?? null

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
          No contacts yet. Invite someone you trust, so they hear when you start a walk, get home or
          miss a check-in.
        </p>
      )}

      <ul className="contacts-list" aria-label="Your trusted contacts">
        {contacts.map((contact) => (
          <li key={contact.id}>
            <button
              type="button"
              className="contacts-row"
              aria-pressed={contact.id === selectedId}
              onClick={() => setSelectedId(contact.id === selectedId ? null : contact.id)}
            >
              <span className="contacts-initial" aria-hidden="true">
                {initialOf(contact.label)}
              </span>
              <span>
                <strong>{contact.label}</strong>
                <span className="contacts-small">{contactStatusText(contact, now)}</span>
              </span>
            </button>
          </li>
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
