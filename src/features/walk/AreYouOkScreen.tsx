import { useState } from 'react'
import TopBar from '../../components/TopBar.tsx'
import CheckInButton from './CheckInButton.tsx'
import GraceCountdown from './GraceCountdown.tsx'
import { EXTEND_MINUTES, namesInWords } from './grace.ts'
import type { Walk } from './walk.ts'
import './walk.css'

type AreYouOkScreenProps = {
  walk: Walk
  phase: 'grace' | 'overdue'
  now: Date
  /** Null while loading: the screen then says "your contacts". */
  contactNames: string[] | null
  onCheckIn: () => Promise<void>
  onExtend: (minutes: number) => Promise<void>
}

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
    <main className="screen screen-tinted walk-alert">
      <TopBar title={`Walking to ${walk.destinationLabel}`} />

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
        {/* The server only extends a walk nobody has been told about yet. */}
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
        <p className="small walk-centered">Choose an action to update your walk.</p>
      </div>
    </main>
  )
}

export default AreYouOkScreen
