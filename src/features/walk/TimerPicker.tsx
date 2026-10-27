import { addMinutes, formatClock, formatDuration } from './time.ts'
import type { TimerRange } from './timerSuggestion.ts'

type TimerPickerProps = {
  minutes: number
  onChange: (minutes: number) => void
  range: TimerRange
  presets: number[]
  now: Date
}

function TimerPicker({ minutes, onChange, range, presets, now }: TimerPickerProps) {
  const checkInBy = formatClock(addMinutes(now, minutes))

  return (
    <section className="walk-timer-picker" aria-labelledby="walk-timer-title">
      <h2 id="walk-timer-title">Choose your timer</h2>
      <div className="walk-stepper">
        <div className="walk-stepper-row">
          <button
            type="button"
            className="walk-step"
            aria-label="1 minute less"
            disabled={minutes <= range.min}
            onClick={() => onChange(minutes - 1)}
          >
            −
          </button>
          <strong className="walk-timer-minutes" aria-live="polite">
            {formatDuration(minutes)}
          </strong>
          <button
            type="button"
            className="walk-step"
            aria-label="1 minute more"
            disabled={minutes >= range.max}
            onClick={() => onChange(minutes + 1)}
          >
            +
          </button>
        </div>
        <input
          type="range"
          className="walk-slider"
          aria-label="Walk timer in minutes"
          aria-valuetext={`${formatDuration(minutes)}, check in by ${checkInBy}`}
          min={range.min}
          max={range.max}
          step={1}
          value={minutes}
          style={{
            ['--fill' as string]: `${((minutes - range.min) / Math.max(1, range.max - range.min)) * 100}%`,
          }}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <div className="walk-slider-ends" aria-hidden="true">
          <span>{formatDuration(range.min)}</span>
          <span>{formatDuration(range.max)}</span>
        </div>
      </div>
      <div className="walk-presets">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className="walk-preset"
            aria-pressed={minutes === preset}
            onClick={() => onChange(preset)}
          >
            {formatDuration(preset)}
          </button>
        ))}
      </div>
      <p className="walk-check-in-by">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        Check in by {checkInBy}
      </p>
    </section>
  )
}

export default TimerPicker
