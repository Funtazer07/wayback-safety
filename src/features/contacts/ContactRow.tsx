import type { Contact } from './contacts.ts'
import { contactStatusText, initialOf } from './contactStatus.ts'

type ContactRowProps = {
  contact: Contact
  now: Date
  isSelected: boolean
  onSelect: () => void
}

/** One person on the Trusted contacts list (screen 14): tap for their options. */
function ContactRow({ contact, now, isSelected, onSelect }: ContactRowProps) {
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
    </li>
  )
}

export default ContactRow
