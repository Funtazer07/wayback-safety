import { useState } from 'react'
import type { LngLat } from '../map/geometry.ts'
import WalkMap from '../map/WalkMap.tsx'
import AreYouOkScreen from './AreYouOkScreen.tsx'
import CheckInButton from './CheckInButton.tsx'
import HomeSafeScreen from './HomeSafeScreen.tsx'
import { walkPhase } from './grace.ts'
import { formatClock, minutesUntil, timerPhase, isReminderDue } from './time.ts'
import { useLocationUpdates } from './useLocationUpdates.ts'
import { useNow } from './useNow.ts'
import { useRefreshDuringGrace } from './useRefreshDuringGrace.ts'
import type { Walk } from './walk.ts'
import { useWalkContactNames } from './useWalkContactNames.ts'
import { useWalkWatchers } from './useWalkWatchers.ts'
import WatchersLine from './WatchersLine.tsx'
import WalkActions from './WalkActions.tsx'
import WalkStatusTimer from './WalkStatusTimer.tsx'
import ArrivedSheet from './ArrivedSheet.tsx'
import RunningLateSheet from './RunningLateSheet.tsx'
import { useWalkPrompts } from './useWalkPrompts.ts'
import WalkReminder from './WalkReminder.tsx'
import './walk.css'

type WalkScreenProps = {
  walk: Walk
  route?: LngLat[] | null
  routeSeconds?: number | null
  onCheckIn: () => Promise<void>
  onExtend?: (minutes: number) => Promise<void>
  onCancel?: () => Promise<void>
  onRefresh?: () => Promise<void>
  onDone: () => void
}

const doNothing = async () => {}

function WalkScreen({
  walk,
  route = null,
  routeSeconds = null,
  onCheckIn,
  onExtend = doNothing,
  onCancel = doNothing,
  onRefresh = doNothing,
  onDone,
}: WalkScreenProps) {
  const [isReviewingTime, setIsReviewingTime] = useState(() => {
    // Set when the walker tapped the reminder push.
    return new URLSearchParams(window.location.search).get('reminder') === walk.id
  })
  const now = useNow()
  const phase = walkPhase(walk, now)
  const isLate = phase === 'grace' || phase === 'overdue'
  useRefreshDuringGrace(phase === 'grace', onRefresh)
  const contactNames = useWalkContactNames(isLate ? walk.id : null)
  const hasCheckedIn = walk.status === 'safe'
  // No location is read or sent once the user is home.
  const { fixes } = useLocationUpdates(hasCheckedIn ? null : walk.id)
  // "Are you home?" and "Running late?", from the SCRUM-97 ideation.
  const prompts = useWalkPrompts({ walk, route, routeSeconds, fixes, now })
  const watchers = useWalkWatchers(hasCheckedIn ? null : walk.id)
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

  // The server's time, so it matches what the contacts were told.
  if (hasCheckedIn) {
    return <HomeSafeScreen walkId={walk.id} endedAt={walk.checkedInAt ?? now} onDone={onDone} />
  }

  // The location keeps being sent here: this is when it matters most.
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
      <WalkMap
        route={route}
        arrivalLabel={`Arrival ${formatClock(walk.deadline)} · ${minutesUntil(walk.deadline, now)} min walk`}
      />

      <section
        className={`walk-panel walk-navigation-panel is-${timerPhase(walk.deadline, now)}`}
        aria-label="Your walk"
      >
        <div className="walk-sheet-handle" aria-hidden="true" />
        <WalkStatusTimer startedAt={walk.startedAt} deadline={walk.deadline} now={now} />
        <div className="walk-panel-top">
          <div className="walk-panel-text">
            <p className="walk-small">Walking to</p>
            <p className="walk-destination">{walk.destinationLabel}</p>
          </div>
          <CheckInButton onCheckIn={handleCheckIn} disabled={isBusy} />
        </div>
        <p className="walk-deadline">Check in by {formatClock(walk.deadline)}</p>
        <WalkActions onExtend={onExtend} onCancel={onCancel} compact />
        <WatchersLine names={watchers} />
        {isReminderDue(walk.deadline, now) && (
          <WalkReminder
            deadline={walk.deadline}
            now={now}
            onReview={() => setIsReviewingTime(true)}
          />
        )}
        {error && <p role="alert">{error}</p>}
      </section>

      {prompts.isArrived && (
        <ArrivedSheet isBusy={isBusy} onHome={handleCheckIn} onNotYet={prompts.dismissArrival} />
      )}
      {!prompts.isArrived && (prompts.suggestion !== null || isReviewingTime) && (
        <RunningLateSheet
          suggestion={prompts.suggestion ?? 10}
          deadline={walk.deadline}
          onExtend={onExtend}
          onDismiss={() => {
            prompts.dismissLate()
            setIsReviewingTime(false)
            const url = new URL(window.location.href)
            url.searchParams.delete('reminder')
            window.history.replaceState(null, '', url)
          }}
        />
      )}
    </main>
  )
}

export default WalkScreen
