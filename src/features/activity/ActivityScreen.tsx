import { useState } from 'react'
import { useContactWalks } from '../followedWalk/useContactWalks.ts'
import NotificationCard from '../notifications/NotificationCard.tsx'
import { activityFeed } from './activity.ts'
import ActivityCard from './ActivityCard.tsx'
import './activity.css'

type ActivityScreenProps = {
  displayName: string
  onOpenWalk: (walkId: string) => void
  onOpenCircle: () => void
}

function ActivityScreen({ displayName, onOpenWalk, onOpenCircle }: ActivityScreenProps) {
  const walks = useContactWalks()
  const feed = activityFeed(walks)
  const [now] = useState(() => new Date())

  return (
    <main className="screen">
      <div className="activity-account">
        <p className="activity-eyebrow">{displayName}’s account</p>
        <span className="initial" aria-hidden="true">
          {displayName.charAt(0).toUpperCase()}
        </span>
      </div>
      <div>
        <h1>Activity</h1>
        <p className="small">Updates from people who trust you.</p>
      </div>

      {feed.length === 0 ? (
        <p className="card">
          No updates yet. When someone you look out for starts a walk, it shows here.
        </p>
      ) : (
        <ul className="activity-list" aria-label="Updates">
          {feed.map((update) => (
            <ActivityCard
              key={update.walkId}
              update={update}
              now={now}
              onOpen={() => onOpenWalk(update.walkId)}
            />
          ))}
        </ul>
      )}

      <button type="button" className="activity-circle" onClick={onOpenCircle}>
        <span>
          <strong>Trusted contacts</strong>
          <span className="small">Choose who hears about each walk, or invite someone.</span>
        </span>
        <span aria-hidden="true">›</span>
      </button>

      {/* For contacts who never walk themselves. */}
      <NotificationCard reason="WayBack can then tell you when your contacts start a walk, get home or miss a check-in, also when your phone is locked." />
    </main>
  )
}

export default ActivityScreen
