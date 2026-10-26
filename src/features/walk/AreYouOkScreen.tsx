import { useState } from 'react'
import CheckInButton from './CheckInButton.tsx'
import GraceCountdown from './GraceCountdown.tsx'
import { EXTEND_MINUTES, namesInWords } from './grace.ts'
import type { Walk } from './walk.ts'
import './walk.css'

type AreYouOkScreenProps = {
  walk: Walk
  /** 'grace': nobody told yet. 'overdue': the contacts have been told (SCRUM-74). */
  phase: 'grace' | 'overdue'
  now: Date
  /** Who follows the walk. Null while loading: the screen then says "your contacts". */
  contactNames: string[] | null
  onCheckIn: () => Promise<void>
  onExtend: (minutes: number) => Promise<void>
}

/**
 * Screen 06 of the SCRUM-72 prototype: the walk's time ran out. The user says they are home or adds
 * time before the contacts are told. Also shown after that (overdue), so the user can still say they
 * are safe. "I need help" from the prototype is SOS (SCRUM-28) and not built yet.
 */
function AreYouOkScreen({
  walk,
  phase,
  now,
  contactNames,
  onCheckIn,
  onExtend,
}: AreYouOkScreenProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasNobody = contactNames !== null && contactNames.length === 0
  const who = contactNames?.length ? namesInWords(contactNames) : 'your contacts'

  async function act(action: () => Promise<void>, failure: string) {
    setError(null)
    setIsBusy(true)
    try {
      await action()
    } catch {
      setError(failure)
    }
    setIsBusy(false)
  }

  return (
    <main className="screen walk-alert">
      <p className="walk-small">Walking to {walk.destinationLabel}</p>

      <svg className="walk-alert-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>

      {phase === 'grace' ? (
        <>
          <h1>Are you okay?</h1>
          <p>Your check-in time has passed. No contact alert has been sent yet.</p>
          <GraceCountdown walk={walk} now={now} who={who} hasNobody={hasNobody} />
        </>
      ) : (
        <>
          <h1>{hasNobody ? 'Your check-in time has passed' : `We told ${who}`}</h1>
          <p>
            {hasNobody
              ? 'Nobody follows this walk, so nobody was told. Tap I’m home to end it.'
              : 'You did not check in, so they got a message with where you last were. Tap I’m home to let them know you are safe.'}
          </p>
        </>
      )}

      <div className="screen-actions">
        {error && <p role="alert">{error}</p>}
        <CheckInButton
          disabled={isBusy}
          onCheckIn={() =>
            act(onCheckIn, 'Could not check you in. Check your connection and try again.')
          }
        />
        {/* The server only extends a walk nobody has been told about yet (SCRUM-63). */}
        {phase === 'grace' && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() =>
              act(
                () => onExtend(EXTEND_MINUTES),
                'Could not add time. Check your connection and try again.',
              )
            }
          >
            I’m okay · Add {EXTEND_MINUTES} minutes
          </button>
        )}
        <p className="walk-small walk-centered">Choose an action to update your walk.</p>
      </div>
    </main>
  )
}

export default AreYouOkScreen
