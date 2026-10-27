import { useState } from 'react'
import type { Contact } from './contacts.ts'

type ContactOptionsProps = {
  contact: Contact
  onPause: (isPaused: boolean) => Promise<void>
  onRemove: () => Promise<void>
}

function ContactOptions({ contact, onPause, onRemove }: ContactOptionsProps) {
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function act(action: () => Promise<void>) {
    setError(null)
    setIsBusy(true)
    try {
      await action()
    } catch {
      setError('That did not work. Check your connection and try again.')
    }
    setIsBusy(false)
  }

  const isInvite = contact.status === 'invited'

  return (
    <section className="contacts-options" aria-label={`${contact.label}, contact options`}>
      <h2>{contact.label} · contact options</h2>
      {isConfirmingRemove ? (
        <>
          <p>
            {isInvite
              ? `Cancel the invite for ${contact.label}? The link stops working.`
              : `Remove ${contact.label}? They will no longer hear about your walks.`}
          </p>
          <div className="contacts-option-buttons">
            <button type="button" disabled={isBusy} onClick={() => act(onRemove)}>
              {isInvite ? 'Yes, cancel invite' : 'Yes, remove'}
            </button>
            <button type="button" disabled={isBusy} onClick={() => setIsConfirmingRemove(false)}>
              Keep
            </button>
          </div>
        </>
      ) : (
        <div className="contacts-option-buttons">
          {!isInvite && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => act(() => onPause(contact.status === 'accepted'))}
            >
              {contact.status === 'accepted' ? 'Pause updates' : 'Resume updates'}
            </button>
          )}
          <button type="button" disabled={isBusy} onClick={() => setIsConfirmingRemove(true)}>
            {isInvite ? 'Cancel invite' : 'Remove contact'}
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}

export default ContactOptions
