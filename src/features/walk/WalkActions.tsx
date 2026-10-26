import { useState } from 'react'
import CancelWalkSheet from './CancelWalkSheet.tsx'

type WalkActionsProps = {
  /** Adds minutes to the deadline on the server (SCRUM-63). Fails when the server refuses. */
  onExtend: (minutes: number) => Promise<void>
  /** Stops the walk on the server. Fails when the server refuses. */
  onCancel: () => Promise<void>
}

// The three amounts of the walk screen variants and screen 13.
export const EXTEND_CHOICES = [5, 10, 15]

/**
 * "Need more time? +5 / +10 / +15" and "Cancel walk" under "I'm home" (SCRUM-94). The deadline only
 * moves when the user taps: the app never moves it by itself (client rule, SCRUM-12).
 */
function WalkActions({ onExtend, onCancel }: WalkActionsProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

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
    <>
      <div className="walk-more-time">
        <p className="walk-more-time-title" id="walk-more-time-title">
          Need more time?
        </p>
        <div className="walk-extend-row" role="group" aria-labelledby="walk-more-time-title">
          {EXTEND_CHOICES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className="walk-extend"
              disabled={isBusy}
              aria-label={`Add ${minutes} minutes`}
              onClick={() =>
                act(
                  () => onExtend(minutes),
                  'Could not add time. Check your connection and try again.',
                )
              }
            >
              +{minutes} min
            </button>
          ))}
        </div>
        {error && !isConfirming && <p role="alert">{error}</p>}
      </div>
      <button
        type="button"
        className="button-danger"
        disabled={isBusy}
        onClick={() => {
          setError(null)
          setIsConfirming(true)
        }}
      >
        Cancel walk
      </button>
      {isConfirming && (
        <CancelWalkSheet
          isBusy={isBusy}
          error={error}
          onConfirm={() =>
            act(onCancel, 'Could not cancel the walk. Check your connection and try again.')
          }
          onKeepWalking={() => setIsConfirming(false)}
        />
      )}
    </>
  )
}

export default WalkActions
