import TopBar from '../../components/TopBar.tsx'
import { formatClock } from '../walk/time.ts'
import type { FollowedWalk } from './followedWalk.ts'
import LastLocationMap from './LastLocationMap.tsx'
import PlannedRouteMap from './PlannedRouteMap.tsx'
import WatchButton from './WatchButton.tsx'
import { useFollowedWalk } from './useFollowedWalk.ts'
import './followedWalk.css'

type FollowedWalkScreenProps = {
  walkId: string
  onClose: () => void
}

/** No Call or Message buttons: the app has no phone numbers. */
function FollowedWalkScreen({ walkId, onClose }: FollowedWalkScreenProps) {
  const { walk, isLoading, error } = useFollowedWalk(walkId)

  return (
    <main className="screen followed">
      <TopBar title="Contacts" onBack={onClose} />
      {isLoading && <p>Loading…</p>}
      {error && <p role="alert">{error}</p>}
      {walk && <WalkDetails walkId={walkId} walk={walk} />}
    </main>
  )
}

function atTime(time: Date | null): string {
  return time ? ` at ${formatClock(time)}` : ''
}

function WalkDetails({ walkId, walk }: { walkId: string; walk: FollowedWalk }) {
  const name = walk.walkerName

  if (walk.status === 'safe') {
    return (
      <>
        <WalkerHeading name={name} title={`${name} is safe`} />
        <p className="followed-box is-safe">
          {name} checked in{atTime(walk.checkedInAt)}. The location is no longer shared.
        </p>
      </>
    )
  }

  if (walk.status === 'cancelled') {
    return (
      <>
        <WalkerHeading name={name} title={`${name} stopped the walk`} />
        <p className="followed-box">
          The walk was cancelled{atTime(walk.cancelledAt)}. No check-in will follow.
        </p>
      </>
    )
  }

  if (walk.status === 'active') {
    return (
      <>
        <WalkerHeading name={name} title={`${name} is on the way home`} />
        <p className="followed-box">Expected home at {formatClock(walk.deadline)}.</p>
        {walk.route && <PlannedRouteMap walkerName={name} route={walk.route} />}
        <WatchButton walkId={walkId} walkerName={name} isWatching={walk.youAreWatching} />
        <p className="followed-note">
          This page updates by itself when {name} gets home. The location is only shared if {name}{' '}
          misses the check-in.
        </p>
      </>
    )
  }

  return (
    <>
      <WalkerHeading name={name} title={`${name}’s walk`} />
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
      <p className="followed-note followed-centered">
        A missed check-in alone does not confirm danger.
      </p>
    </>
  )
}

function WalkerHeading({ name, title }: { name: string; title: string }) {
  return (
    <div className="followed-heading">
      <span className="initial" aria-hidden="true">
        {name.charAt(0).toUpperCase()}
      </span>
      <h1>{title}</h1>
    </div>
  )
}

export default FollowedWalkScreen
