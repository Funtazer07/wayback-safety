import { useEffect, useState } from 'react'
import { isInstalled } from '../../lib/install.ts'
import NotificationCard from '../notifications/NotificationCard.tsx'
import { acceptInvite, declineInvite, fetchInvite, type InviteDetails } from './contacts.ts'
import './contacts.css'

type AcceptInviteScreenProps = {
  /** The secret from the invite link (?invite=). */
  token: string
  /** Closes this screen, after an answer or when the link does not work. */
  onClose: () => void
}

type Step = 'loading' | 'question' | 'accepted' | 'failed'

/**
 * What a contact sees after opening an invite link (screen 09, "Sam invited you"). Nothing is shared
 * with them until they accept. After accepting, the app asks for notifications: the system question
 * appears only after a tap, as the design's "Contact · System request" frame says.
 */
function AcceptInviteScreen({ token, onClose }: AcceptInviteScreenProps) {
  const [step, setStep] = useState<Step>('loading')
  const [details, setDetails] = useState<InviteDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    let isCurrent = true
    fetchInvite(token)
      .then((found) => {
        if (!isCurrent) return
        setDetails(found)
        setStep('question')
      })
      .catch(() => isCurrent && setStep('failed'))
    return () => {
      isCurrent = false
    }
  }, [token])

  async function answer(action: () => Promise<void>, next: () => void) {
    setError(null)
    setIsBusy(true)
    try {
      await action()
      next()
    } catch (failure) {
      // The server's own words for the cases a user can understand.
      const message = failure instanceof Error ? failure.message : ''
      setError(
        /own invite|already look out/.test(message)
          ? `${message}.`
          : 'That did not work. Check your connection and try again.',
      )
    }
    setIsBusy(false)
  }

  const name = details?.inviterName ?? 'Someone'

  return (
    <main className="screen contacts-invited">
      {step === 'loading' && <p>Loading…</p>}

      {step === 'failed' && (
        <>
          <h1>This invite does not work</h1>
          <p>It was already used, cancelled, or is older than 48 hours. Ask for a new link.</p>
        </>
      )}

      {step === 'question' && (
        <>
          <h1>{name} invited you</h1>
          {/* Both ways since 26 Oct (0014_mutual_contacts.sql): said before the tap, because the
              user's own walks are shared too. */}
          <p>
            Accept to look out for each other. You will hear when {name} starts a walk, gets home,
            or misses a check-in, and {name} will hear the same about your walks. Nothing is shared
            before you accept.
          </p>
        </>
      )}

      {step === 'accepted' && (
        <>
          <h1>You and {name} now look out for each other</h1>
          <NotificationCard
            reason={`WayBack can then tell you when ${name} starts a walk, gets home, or misses a check-in.`}
          />
          {/* An invite link opens in the browser. Added to the Home Screen, WayBack starts again
              signed out (on iPhone it has its own storage), so say where to continue. Accepting
              itself is already saved. */}
          {!isInstalled() && (
            <p className="contacts-small">
              Your answer is saved. If you add WayBack to your Home Screen, open it from there, sign
              in again and turn on notifications under Contacts.
            </p>
          )}
        </>
      )}

      <div className="screen-actions">
        {error && <p role="alert">{error}</p>}
        {step === 'question' && (
          <>
            <button
              type="button"
              className="button-primary"
              disabled={isBusy}
              onClick={() =>
                answer(
                  () => acceptInvite(token),
                  () => setStep('accepted'),
                )
              }
            >
              Accept
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => answer(() => declineInvite(token), onClose)}
            >
              Decline
            </button>
          </>
        )}
        {step !== 'question' && step !== 'loading' && (
          <button type="button" className="button-primary" onClick={onClose}>
            Done
          </button>
        )}
      </div>
    </main>
  )
}

export default AcceptInviteScreen
