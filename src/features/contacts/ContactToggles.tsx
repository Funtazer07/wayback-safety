import type { Contact } from './contacts.ts'
import { initialOf } from './contactStatus.ts'
import './contacts.css'

type ContactTogglesProps = {
  /** The user's contacts. Only accepted ones can follow a walk; the others are not listed. */
  contacts: Contact[]
  isLoading: boolean
  /** The ids of the contacts who will follow this walk. */
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
}

/** "Notify these trusted contacts" on screen 04: a switch per contact who accepted. */
function ContactToggles({ contacts, isLoading, selectedIds, onChange }: ContactTogglesProps) {
  const followers = contacts.filter((contact) => contact.status === 'accepted')

  function toggle(contactId: string, isOn: boolean) {
    onChange(isOn ? [...selectedIds, contactId] : selectedIds.filter((id) => id !== contactId))
  }

  return (
    <fieldset className="contacts-toggles">
      <legend>Notify these trusted contacts</legend>
      {isLoading && <p className="contacts-small">Loading your contacts…</p>}
      {!isLoading && followers.length === 0 && (
        // Honest about what happens: without contacts nobody is alerted when time runs out.
        <p className="contacts-small">
          No trusted contacts yet, so nobody is alerted if you do not check in. Invite someone under
          Contacts.
        </p>
      )}
      {followers.map((contact) => (
        <label key={contact.id} className="contacts-toggle">
          <span className="contacts-initial" aria-hidden="true">
            {initialOf(contact.label)}
          </span>
          <span className="contacts-toggle-name">{contact.label}</span>
          <input
            type="checkbox"
            role="switch"
            checked={selectedIds.includes(contact.id)}
            onChange={(event) => toggle(contact.id, event.target.checked)}
          />
        </label>
      ))}
    </fieldset>
  )
}

export default ContactToggles
