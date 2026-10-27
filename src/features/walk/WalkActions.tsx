import { useState } from 'react'
import CancelWalkSheet from './CancelWalkSheet.tsx'

type WalkActionsProps = {
  compact?: boolean
  /** Adds minutes to the deadline on the server (SCRUM-63). Fails when the server refuses. */
  onExtend: (minutes: number) => Promise<void>
  onCancel: () => Promise<void>
}

export const EXTEND_CHOICES = [5, 10, 15]

/**
 * "Need more time? +5 / +10 / +15" and "Cancel walk" under "I'm home" (SCRUM-94). The deadline only
 * moves when the user taps: the app never moves it by itself (client rule, SCRUM-12).
 */
function WalkActions({ onExtend, onCancel, compact = false }: WalkActionsProps) {
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

  const actions = (
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
        className={compact ? 'button-danger walk-cancel-icon' : 'button-danger'}
        aria-label={compact ? 'Cancel walk' : undefined}
        title={compact ? 'Cancel walk' : undefined}
        disabled={isBusy}
        onClick={() => {
          setError(null)
          setIsConfirming(true)
        }}
      >
        {compact ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          'Cancel walk'
        )}
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

  return compact ? <div className="walk-actions-inline">{actions}</div> : actions
}

export default WalkActions
