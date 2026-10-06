import CityMap from '../map/CityMap.tsx'
import { formatClock } from './time.ts'
import { useLocationUpdates } from './useLocationUpdates.ts'
import { useNow } from './useNow.ts'
import type { Walk } from './walk.ts'
import WalkTimer from './WalkTimer.tsx'
import './walk.css'

type WalkScreenProps = {
  walk: Walk
}

/** Screen 2 of the walk wireframe: the map, with the time left readable at a glance. */
function WalkScreen({ walk }: WalkScreenProps) {
  const now = useNow()
  const isLocationOff = useLocationUpdates(walk.id)

  return (
    <main className="walk-live">
      <CityMap isCompact followsUser />

      <section className="walk-panel" aria-label="Your walk">
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

        {/* The check-in button comes here. It is designed and built in SCRUM-47. Until then a walk
            cannot be ended from the app. */}
      </section>
    </main>
  )
}

export default WalkScreen
