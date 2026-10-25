import { graceEndsAt } from './grace.ts'
import { formatCountdown, minutesUntil, secondsUntil } from './time.ts'
import type { Walk } from './walk.ts'

type GraceCountdownProps = {
  walk: Walk
  now: Date
  /** "Mum and Alex", or "your contacts" while the names load. */
  who: string
  /** Nobody follows this walk: then nobody will be alerted, and the screen must not say otherwise. */
  hasNobody: boolean
}

/** The yellow box on screen 06: who is told, and how long until then. */
function GraceCountdown({ walk, now, who, hasNobody }: GraceCountdownProps) {
  if (hasNobody) {
    return <p className="walk-alert-box">Nobody follows this walk, so nobody will be alerted.</p>
  }

  const endsAt = graceEndsAt(walk)
  const seconds = secondsUntil(endsAt, now)

  // The server checks once a minute, so 00:00 can stay on screen for a moment before it acts.
  if (seconds === 0) {
    return <p className="walk-alert-box">We are notifying {who} now.</p>
  }

  return (
    <div
      className="walk-alert-box"
      role="timer"
      // Minutes, not seconds: a screen reader should not be told something new every second.
      aria-label={`We’ll notify ${who} in ${minutesUntil(endsAt, now)} min`}
    >
      <p aria-hidden="true">We’ll notify {who} in</p>
      <p className="walk-alert-countdown" aria-hidden="true">
        {formatCountdown(seconds)}
      </p>
    </div>
  )
}

export default GraceCountdown
