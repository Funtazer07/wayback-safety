import { formatCountdown, minutesUntil, secondsUntil, timeLeftShare, timerPhase } from './time.ts'

type WalkStatusTimerProps = {
  startedAt: Date
  deadline: Date
  now: Date
}

/** The compact time and elapsed-time bar from the walk-screen design. */
function WalkStatusTimer({ startedAt, deadline, now }: WalkStatusTimerProps) {
  const minutes = minutesUntil(deadline, now)
  const share = 1 - timeLeftShare(startedAt, deadline, now)

  return (
    <div className={`walk-status-timer is-${timerPhase(deadline, now)}`}>
      <p className="walk-status-count" role="timer" aria-label={`${minutes} min left`}>
        <strong>{formatCountdown(secondsUntil(deadline, now))}</strong> <span>min left</span>
      </p>
      <div
        className="walk-status-track"
        role="progressbar"
        aria-label="Walk time elapsed"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(share * 100)}
      >
        <div className="walk-status-fill" style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  )
}

export default WalkStatusTimer
