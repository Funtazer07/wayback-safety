import { useState } from 'react'
import type { LngLat } from '../map/geometry.ts'
import WalkMap from '../map/WalkMap.tsx'
import AreYouOkScreen from './AreYouOkScreen.tsx'
import CheckInButton from './CheckInButton.tsx'
import HomeSafeScreen from './HomeSafeScreen.tsx'
import { walkPhase } from './grace.ts'
import { formatClock, timerPhase } from './time.ts'
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
  /** Called when the user leaves the "You're home" screen. */
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
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckIn() {
    setError(null)
    setIsBusy(true)
    try {
      await onCheckIn()
    } catch {
      setError('Could not check you in. Check your connection and try again.')
    }
    setIsBusy(false)
  }

  // Screen 12 (SCRUM-106). The server's check-in time when it is known, so it matches what the
  // contacts were told; otherwise this moment.
  if (hasCheckedIn) {
    return <HomeSafeScreen walkId={walk.id} endedAt={walk.checkedInAt ?? now} onDone={onDone} />
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

      {/* The whole panel turns yellow in the last minutes, as on the "almost over" design; the
          timer also says "Almost time", so colour is not the only sign. */}
      <section className={`walk-panel is-${timerPhase(walk.deadline, now)}`} aria-label="Your walk">
        <div className="walk-panel-top">
          <WalkTimer startedAt={walk.startedAt} deadline={walk.deadline} now={now} />
          <div className="walk-panel-text">
            <p className="walk-small">Walking to</p>
            <p className="walk-destination">{walk.destinationLabel}</p>
            <p>
              Home by <strong>{formatClock(walk.deadline)}</strong>
            </p>
            <p className="walk-small">
              {isLocationOff
                ? 'Location is off, so the app cannot save where you last were.'
                : 'The app saves where you last were.'}
            </p>
          </div>
        </div>
        {error && <p role="alert">{error}</p>}
        <CheckInButton onCheckIn={handleCheckIn} disabled={isBusy} />
      </section>
    </main>
  )
}

export default WalkScreen
