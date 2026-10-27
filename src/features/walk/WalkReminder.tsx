import { formatClock, minutesUntil } from './time.ts'

type WalkReminderProps = {
  deadline: Date
  now: Date
  onReview: () => void
}

/** While the app is open; a push covers a locked phone. */
function WalkReminder({ deadline, now, onReview }: WalkReminderProps) {
  return (
    <div className="walk-reminder">
      <p role="status">
        <strong>Your walk is almost over.</strong> Your check-in is due at {formatClock(deadline)}.
        You have {minutesUntil(deadline, now)} min left. Do you need more time?
      </p>
      <button type="button" className="walk-extend" onClick={onReview}>
        Review check-in time
      </button>
    </div>
  )
}

export default WalkReminder
