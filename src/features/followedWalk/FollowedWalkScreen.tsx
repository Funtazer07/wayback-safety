import { formatClock } from '../walk/time.ts'
import type { FollowedWalk } from './followedWalk.ts'
import LastLocationMap from './LastLocationMap.tsx'
import { useFollowedWalk } from './useFollowedWalk.ts'
import './followedWalk.css'

type FollowedWalkScreenProps = {
  walkId: string
  /** Closes this screen and goes back to Home. */
  onClose: () => void
}

/**
 * Screen 10 of the SCRUM-72 prototype: what a contact sees after tapping the alert (SCRUM-74).
 * "Call" and "Message" from the design are left out: the app has no phone numbers (SCRUM-102).
 */
function FollowedWalkScreen({ walkId, onClose }: FollowedWalkScreenProps) {
  const { walk, isLoading, error } = useFollowedWalk(walkId)

  return (
    <main className="screen followed">
      <button type="button" className="button-link followed-back" onClick={onClose}>
        <span aria-hidden="true">‹ </span>Back
      </button>
      {isLoading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
      {walk && <WalkDetails walk={walk} />}
    </main>
  )
}

// " at 22:44", or nothing. The database always saves these times, so nothing is a safety net only.
function atTime(time: Date | null): string {
  return time ? ` at ${formatClock(time)}` : ''
}

function WalkDetails({ walk }: { walk: FollowedWalk }) {
  const name = walk.walkerName

  if (walk.status === 'safe') {
    return (
      <>
        <h1>{name} is safe</h1>
        <p className="followed-box is-safe">
          {name} checked in{atTime(walk.checkedInAt)}. The location is no longer shared.
        </p>
      </>
    )
  }

  if (walk.status === 'cancelled') {
    return (
      <>
        <h1>{name} stopped the walk</h1>
        <p className="followed-box">
          The walk was cancelled{atTime(walk.cancelledAt)}. No check-in will follow.
        </p>
      </>
    )
  }

  if (walk.status === 'active') {
    // Opened from "is on the way home": nothing is wrong yet, and no location is shared.
    return (
      <>
        <h1>{name} is on the way home</h1>
        <p className="followed-box">Expected home at {formatClock(walk.deadline)}.</p>
        <p className="followed-note">
          This page updates by itself when {name} gets home. The location is only shared if {name}{' '}
          misses the check-in.
        </p>
      </>
    )
  }

  return (
    <>
      <h1>{name}’s walk</h1>
      <div className="followed-box is-overdue">
        <p>
          <strong>Check-in overdue</strong>
        </p>
        <p>Due at {formatClock(walk.deadline)}. No confirmation yet.</p>
      </div>
      {walk.lastLocation ? (
        <>
          <LastLocationMap
            coordinates={walk.lastLocation.coordinates}
            savedAt={walk.lastLocation.savedAt}
          />
          <p className="followed-note">This is the last shared location, not a live position.</p>
        </>
      ) : (
        <p className="followed-note">No location was shared during this walk.</p>
      )}
      <p className="followed-note">This page updates by itself when {name} checks in.</p>
    </>
  )
}

export default FollowedWalkScreen
