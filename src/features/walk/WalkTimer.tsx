import {
  formatCountdown,
  minutesUntil,
  secondsUntil,
  timeLeftShare,
  timerPhase,
  type TimerPhase,
} from './time.ts'

type WalkTimerProps = {
  startedAt: Date
  deadline: Date
  now: Date
}

// Colour is never the only sign: each phase also has its own words under the countdown.
const phaseLabel: Record<TimerPhase, string> = {
  'on-time': 'left',
  'almost-up': 'Almost time',
  'time-up': 'Time is up',
}

/** A ring that empties as the walk's time runs out, with the countdown in the middle. */
function WalkTimer({ startedAt, deadline, now }: WalkTimerProps) {
  const phase = timerPhase(deadline, now)
  const share = timeLeftShare(startedAt, deadline, now)
  const minutes = minutesUntil(deadline, now)

  return (
    <div
      className={`walk-timer-ring is-${phase}`}
      role="timer"
      // Minutes, not seconds: a screen reader should not be told something new every second.
      aria-label={phase === 'time-up' ? 'Time is up' : `${minutes} min left`}
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="walk-timer-track" cx="60" cy="60" r="54" />
        <circle
          className="walk-timer-progress"
          cx="60"
          cy="60"
          r="54"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - share}
        />
      </svg>
      <div className="walk-timer-text" aria-hidden="true">
        <span className="walk-timer-count">{formatCountdown(secondsUntil(deadline, now))}</span>
        <span className="walk-timer-label">{phaseLabel[phase]}</span>
      </div>
    </div>
  )
}

export default WalkTimer
