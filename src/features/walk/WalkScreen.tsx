import { useState } from 'react'
import type { LngLat } from '../map/geometry.ts'
import WalkMap from '../map/WalkMap.tsx'
import AreYouOkScreen from './AreYouOkScreen.tsx'
import CheckInButton from './CheckInButton.tsx'
import CheckInConfirmation from './CheckInConfirmation.tsx'
import { walkPhase } from './grace.ts'
import { formatClock } from './time.ts'
import { useLocationUpdates } from './useLocationUpdates.ts'
import { useNow } from './useNow.ts'
import { useRefreshDuringGrace } from './useRefreshDuringGrace.ts'
import type { Walk } from './walk.ts'
import { useWalkContactNames } from './useWalkContactNames.ts'
import WalkTimer from './WalkTimer.tsx'
import './walk.css'

type WalkScreenProps = {
  walk: Walk
  /** The route chosen on Home for this walk, shown on the map. */
  route?: LngLat[] | null
  /** Tells the server the user is home. Fails when the server cannot be reached. */
  onCheckIn: () => Promise<void>
  /** Gives the user more time. Fails when the server cannot be reached or refuses. */
  onExtend?: (minutes: number) => Promise<void>
  /** Asks the server for the walk again, to hear about the warning and about overdue. */
  onRefresh?: () => Promise<void>
  /** Called when the user closes the "You arrived safely!" message. */
  onDone: () => void
}

const doNothing = async () => {}

/**
 * Screen 2 of the walk wireframe: the map, with the time left readable at a glance. Once the time
 * has run out it becomes the "Are you okay?" screen (SCRUM-101).
 */
function WalkScreen({
  walk,
  route = null,
  onCheckIn,
  onExtend = doNothing,
  onRefresh = doNothing,
  onDone,
}: WalkScreenProps) {
  const now = useNow()
  const phase = walkPhase(walk, now)
  const isLate = phase === 'grace' || phase === 'overdue'
  useRefreshDuringGrace(phase === 'grace', onRefresh)
  const contactNames = useWalkContactNames(isLate ? walk.id : null)
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

  // The location keeps being sent on this screen too: when the contacts are told, where the user
  // last was matters most.
  if (isLate) {
    return (
      <AreYouOkScreen
        walk={walk}
        phase={phase}
        now={now}
        contactNames={contactNames}
        onCheckIn={onCheckIn}
        onExtend={onExtend}
      />
    )
  }

  return (
    <main className="walk-live">
      <WalkMap route={route} />

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
