import { useState } from 'react'
import CityMap from '../map/CityMap.tsx'
import CheckInButton from './CheckInButton.tsx'
import CheckInConfirmation from './CheckInConfirmation.tsx'
import { formatClock } from './time.ts'
import { useLocationUpdates } from './useLocationUpdates.ts'
import { useNow } from './useNow.ts'
import type { Walk } from './walk.ts'
import WalkTimer from './WalkTimer.tsx'
import './walk.css'

type WalkScreenProps = {
  walk: Walk
  /** Tells the server the user is home. Fails when the server cannot be reached. */
  onCheckIn: () => Promise<void>
  /** Called when the user closes the "You arrived safely!" message. */
  onDone: () => void
}

/** Screen 2 of the walk wireframe: the map, with the time left readable at a glance. */
function WalkScreen({ walk, onCheckIn, onDone }: WalkScreenProps) {
  const now = useNow()
  const hasCheckedIn = walk.status === 'safe'
  // No location is read or sent once the user is home.
  const isLocationOff = useLocationUpdates(hasCheckedIn ? null : walk.id)
  const [arrivedAt, setArrivedAt] = useState<Date | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckIn() {
    setError(null)
    setIsBusy(true)
    try {
      await onCheckIn()
      // The countdown stops at the moment of the check-in instead of running on behind the message.
      setArrivedAt(new Date())
    } catch {
      setError('Could not check you in. Check your connection and try again.')
    }
    setIsBusy(false)
  }

  return (
    <main className="walk-live">
      <CityMap isCompact followsUser />

      <section className="walk-panel" aria-label="Your walk">
        <WalkTimer startedAt={walk.startedAt} deadline={walk.deadline} now={arrivedAt ?? now} />

        <div className="walk-panel-text">
          <p className="walk-small">Walking to</p>
          <p className="walk-destination">{walk.destinationLabel}</p>
          <CheckInButton onCheckIn={handleCheckIn} disabled={isBusy || hasCheckedIn} />
          <p>
            Home by <strong>{formatClock(walk.deadline)}</strong>
          </p>
          {error && <p role="alert">{error}</p>}
          <p className="walk-small">
            {hasCheckedIn
              ? 'Your walk has ended. The app no longer saves where you are.'
              : isLocationOff
                ? 'Location is off, so the app cannot save where you last were.'
                : 'The app saves where you last were.'}
          </p>
        </div>
      </section>

      <CheckInConfirmation isOpen={hasCheckedIn} onClose={onDone} />
    </main>
  )
}

export default WalkScreen
