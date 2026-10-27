import { useState, type FormEvent } from 'react'
import type { Invite } from './contacts.ts'
import { copyInvite, shareInvite } from './invites.ts'

type InviteSheetProps = {
  displayName: string
  onInvite: (label: string) => Promise<Invite>
  onClose: () => void
}

function InviteSheet({ displayName, onInvite, onClose }: InviteSheetProps) {
  const [label, setLabel] = useState('')
  const [invite, setInvite] = useState<Invite | null>(null)
  const [canOnlyCopy, setCanOnlyCopy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function share(link: string) {
    const result = await shareInvite(displayName, link)
    setCanOnlyCopy(result === 'copy')
    if (result === 'shared') setMessage('Sent. Once they accept, they show as accepted here.')
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    setIsBusy(true)
    try {
      const created = await onInvite(label.trim())
      setInvite(created)
      await share(created.link)
    } catch {
      setMessage('Could not make an invite. Check your connection and try again.')
    }
    setIsBusy(false)
  }

  async function handleCopy(link: string) {
    try {
      await copyInvite(link)
      setMessage('Link copied. Paste it in a message to your contact.')
    } catch {
      setMessage('Could not copy. Select the link above and copy it yourself.')
    }
  }

  return (
    <div className="sheet-backdrop">
      <section className="sheet" role="dialog" aria-labelledby="invite-title">
        <h2 id="invite-title">Invite a trusted contact</h2>
        {invite ? (
          <>
            <p>
              The link works once, for 48 hours. Only the person who accepts it becomes a contact.
            </p>
            {canOnlyCopy ? (
              <>
                <p className="contacts-link">{invite.link}</p>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => handleCopy(invite.link)}
                >
                  Copy link
                </button>
              </>
            ) : (
              <button type="button" className="button-primary" onClick={() => share(invite.link)}>
                Share the link again
              </button>
            )}
          </>
        ) : (
          <form className="screen-fill" onSubmit={handleCreate}>
            <label htmlFor="invite-label">What do you call them?</label>
            <input
              id="invite-label"
              value={label}
              maxLength={40}
              placeholder="For example Mum or Alex"
              onChange={(event) => setLabel(event.target.value)}
            />
            <p className="contacts-small">Only you and this contact see this name.</p>
            <button type="submit" className="button-primary" disabled={isBusy || !label.trim()}>
              Make an invite link
            </button>
          </form>
        )}
        {message && <p role="status">{message}</p>}
        <button type="button" className="button-link" onClick={onClose}>
          {invite ? 'Done' : 'Cancel'}
        </button>
      </section>
    </div>
  )
}

export default InviteSheet
