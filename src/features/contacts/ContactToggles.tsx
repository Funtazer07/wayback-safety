import type { Contact } from './contacts.ts'
import { initialOf } from './contactStatus.ts'
import './contacts.css'

type ContactTogglesProps = {
  /** Only accepted contacts are listed. */
  contacts: Contact[]
  isLoading: boolean
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
}

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
          <span className="contacts-toggle-name">
            {contact.label}
            {contact.canReceiveAlerts === false && (
              <span className="contacts-small">Notifications off: will not get an alert</span>
            )}
          </span>
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
