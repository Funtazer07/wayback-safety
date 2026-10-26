import { activityTime, type ActivityUpdate } from './activity.ts'

type ActivityCardProps = {
  update: ActivityUpdate
  now: Date
  onOpen: () => void
}

/**
 * One update in the feed (screen 09): a bell, who and what, the time, and the details. The whole
 * card opens the walk; an overdue one also says "View walk", as in the design.
 */
function ActivityCard({ update, now, onOpen }: ActivityCardProps) {
  return (
    <li>
      <button type="button" className={`activity-card is-${update.tone}`} onClick={onOpen}>
        <span className="activity-card-top">
          <span className="activity-bell" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
          </span>
          <strong className="activity-title">{update.title}</strong>
          <span className="activity-time">{activityTime(update.at, now)}</span>
        </span>
        {update.lines.map((line) => (
          <span key={line} className="activity-line">
            {line}
          </span>
        ))}
        {update.tone === 'overdue' && (
          <span className="activity-link">
            View walk <span aria-hidden="true">›</span>
          </span>
        )}
      </button>
    </li>
  )
}

export default ActivityCard
