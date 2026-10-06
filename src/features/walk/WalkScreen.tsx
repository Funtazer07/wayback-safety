import { formatClock, minutesUntil } from './time.ts'
import { useLocationUpdates } from './useLocationUpdates.ts'
import { useNow } from './useNow.ts'
import type { Walk } from './walk.ts'
import './walk.css'

type WalkScreenProps = {
  walk: Walk
}

/** Screen 2 of the walk wireframe: the time left, readable at a glance. */
function WalkScreen({ walk }: WalkScreenProps) {
  const now = useNow()
  const isLocationOff = useLocationUpdates(walk.id)
  const isTimeUp = now.getTime() >= walk.deadline.getTime()

  return (
    <main className="screen">
      <p>Walking to {walk.destinationLabel}</p>
      {isTimeUp ? (
        <div>
          <p className="walk-time walk-time-up">Time is up</p>
          <p>You planned to be home by {formatClock(walk.deadline)}.</p>
        </div>
      ) : (
        <div>
          <p className="walk-time">
            <span className="walk-time-number">{minutesUntil(walk.deadline, now)}</span> min left
          </p>
          <p>Home by {formatClock(walk.deadline)}</p>
        </div>
      )}

      <p className="walk-card">
        {isLocationOff
          ? 'Location is off, so the app cannot save where you last were.'
          : 'While the walk runs, the app saves where you last were.'}
      </p>

      {/* The check-in button comes here. It is designed and built in SCRUM-47. Until then a walk
          cannot be ended from the app. */}
    </main>
  )
}

export default WalkScreen
