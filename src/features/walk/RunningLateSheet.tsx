import { useState } from 'react'
import { addMinutes, formatClock } from './time.ts'
import { EXTEND_CHOICES } from './WalkActions.tsx'

type RunningLateSheetProps = {
  suggestion: number
  deadline: Date
  onExtend: (minutes: number) => Promise<void>
  onDismiss: () => void
}

function RunningLateSheet({ suggestion, deadline, onExtend, onDismiss }: RunningLateSheetProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function extend(minutes: number) {
    setError(null)
    setIsBusy(true)
    try {
      await onExtend(minutes)
      onDismiss()
    } catch {
      setError('Could not add time. Check your connection and try again.')
      setIsBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop">
      <section
        className="sheet walk-late-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="walk-late-title"
      >
        <div>
          <h2 id="walk-late-title">Running late?</h2>
          <p className="small">Your timer changes only when you confirm.</p>
        </div>
        <div className="card">
          <p className="walk-label">Suggested update</p>
          <p className="walk-late-amount">Add {suggestion} minutes?</p>
          <p className="small">
            New check-in time: {formatClock(addMinutes(deadline, suggestion))}
          </p>
        </div>
        {error && <p role="alert">{error}</p>}
        <button
          type="button"
          className="button-primary"
          disabled={isBusy}
          onClick={() => extend(suggestion)}
        >
          Confirm +{suggestion} minutes
        </button>
        <p className="walk-more-time-title" id="walk-late-other">
          Or choose another amount
        </p>
        <div className="walk-extend-row" role="group" aria-labelledby="walk-late-other">
          {EXTEND_CHOICES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className="walk-extend"
              disabled={isBusy}
              aria-label={`Add ${minutes} minutes`}
              onClick={() => extend(minutes)}
            >
              +{minutes} min
            </button>
          ))}
        </div>
        <button type="button" className="button-link" disabled={isBusy} onClick={onDismiss}>
          Keep my time
        </button>
      </section>
    </div>
  )
}

export default RunningLateSheet
