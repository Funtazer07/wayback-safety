import { useState } from 'react'
import { HOME } from './destination.ts'
import DestinationSheet from './DestinationSheet.tsx'
import { addMinutes, formatClock } from './time.ts'
import { useNow } from './useNow.ts'
import type { NewWalk } from './walk.ts'
import './walk.css'

type StartWalkScreenProps = {
  onStart: (newWalk: NewWalk) => Promise<void>
  onBack: () => void
}

// Assumptions: the wireframe shows 20 min with a minus and a plus button, but not the step size
// or the limits. The server accepts 1 to 180 minutes.
const DEFAULT_MINUTES = 20
const STEP = 5
const MAX_MINUTES = 180

/** Screen 1 of the walk wireframe: check the destination and the timer, then go. */
function StartWalkScreen({ onStart, onBack }: StartWalkScreenProps) {
  const [destination, setDestination] = useState(HOME)
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const now = useNow()

  async function handleStart() {
    setError(null)
    setIsBusy(true)
    try {
      await onStart({ destinationLabel: destination, minutes })
    } catch {
      setError('Could not start the walk. Check your connection and try again.')
      setIsBusy(false)
    }
  }

  function handleUse(place: string) {
    setDestination(place)
    setIsSheetOpen(false)
  }

  return (
    <main className="screen">
      <h1>Start a walk</h1>
      <p>Check these two things, then go.</p>

      <div className="walk-card walk-row">
        <p>
          <span className="walk-small">Going to</span>
          <strong>{destination}</strong>
        </p>
        <button type="button" className="button-link" onClick={() => setIsSheetOpen(true)}>
          Change
        </button>
      </div>

      <div className="walk-card">
        <p className="walk-small">Walk timer</p>
        <div className="walk-row">
          <button
            type="button"
            className="walk-step"
            aria-label={`${STEP} minutes less`}
            disabled={minutes <= STEP}
            onClick={() => setMinutes(minutes - STEP)}
          >
            −
          </button>
          <p className="walk-timer" aria-live="polite">
            <strong>{minutes} min</strong>
            <span className="walk-small">Home by {formatClock(addMinutes(now, minutes))}</span>
          </p>
          <button
            type="button"
            className="walk-step"
            aria-label={`${STEP} minutes more`}
            disabled={minutes >= MAX_MINUTES}
            onClick={() => setMinutes(minutes + STEP)}
          >
            +
          </button>
        </div>
        {/* The wireframe shows an estimated walking time here. The app cannot work one out yet
            (that needs an address lookup and a route), so it asks the user instead. */}
        <p className="walk-small">Set how long your walk takes. Add time if you are not sure.</p>
      </div>

      <div className="screen-actions">
        {error && <p role="alert">{error}</p>}
        <button type="button" className="button-primary" disabled={isBusy} onClick={handleStart}>
          Start walk
        </button>
        {/* Not in the wireframe: without it there is no way back to Home. */}
        <button type="button" className="button-link" onClick={onBack}>
          Not now
        </button>
        <p className="walk-small walk-centered">Location is used only while the walk runs.</p>
      </div>

      {isSheetOpen && (
        <DestinationSheet
          destination={destination}
          onUse={handleUse}
          onClose={() => setIsSheetOpen(false)}
        />
      )}
    </main>
  )
}

export default StartWalkScreen
