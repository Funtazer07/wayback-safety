import { addMinutes, formatClock, formatDuration } from './time.ts'

type TimerPickerProps = {
  minutes: number
  onChange: (minutes: number) => void
  now: Date
}

// Assumptions: the design shows − and + around "20 min" but not the step size or the limits. The
// server accepts 1 to 180 minutes.
const STEP = 5
const MAX_MINUTES = 180
// The four quick choices under the timer on screen 04.
const PRESETS = [10, 15, 20, 30]

/** "Choose your timer" on screen 04: − 20 min +, the quick choices, and "Check in by 22:26". */
function TimerPicker({ minutes, onChange, now }: TimerPickerProps) {
  return (
    <section className="walk-timer-picker" aria-labelledby="walk-timer-title">
      <h2 id="walk-timer-title">Choose your timer</h2>
      <div className="walk-stepper">
        <button
          type="button"
          className="walk-step"
          aria-label={`${STEP} minutes less`}
          disabled={minutes <= STEP}
          onClick={() => onChange(minutes - STEP)}
        >
          −
        </button>
        <strong className="walk-timer-minutes" aria-live="polite">
          {formatDuration(minutes)}
        </strong>
        <button
          type="button"
          className="walk-step"
          aria-label={`${STEP} minutes more`}
          disabled={minutes >= MAX_MINUTES}
          onClick={() => onChange(minutes + STEP)}
        >
          +
        </button>
      </div>
      <div className="walk-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className="walk-preset"
            aria-pressed={minutes === preset}
            onClick={() => onChange(preset)}
          >
            {preset} min
          </button>
        ))}
      </div>
      <p className="walk-check-in-by">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        Check in by {formatClock(addMinutes(now, minutes))}
      </p>
    </section>
  )
}

export default TimerPicker
