import type { ArrivalUpdate } from './arrival.ts'
import { namesInWords } from './grace.ts'
import { formatClock } from './time.ts'
import { useArrivalUpdate } from './useArrivalUpdate.ts'
import './checkIn.css'

type HomeSafeScreenProps = {
  walkId: string
  endedAt: Date
  onDone: () => void
}

// All three are true the moment the server answers the check-in.
const doneSteps = ['Timer stopped', 'Location sharing stopped', 'Check-in saved']

function Tick() {
  return (
    <svg className="walk-home-tick" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function HomeSafeScreen({ walkId, endedAt, onDone }: HomeSafeScreenProps) {
  const update = useArrivalUpdate(walkId)

  return (
    <main className="screen screen-tinted walk-home">
      <div className="screen-icon walk-home-mark">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <div className="walk-home-heading">
        <h1>You’re home.</h1>
        <p className="small">Your walk ended at {formatClock(endedAt)}.</p>
      </div>

      <ul className="card walk-home-steps" aria-label="What the check-in did">
        {doneSteps.map((step) => (
          <li key={step}>
            <Tick />
            {step}
          </li>
        ))}
      </ul>

      {update && <ContactsTold update={update} />}

      <div className="screen-actions">
        <button type="button" className="button-primary" onClick={onDone}>
          Back to your places
        </button>
      </div>
    </main>
  )
}

/** Says "sent", not "delivered": the app cannot know that a phone showed the message. */
function ContactsTold({ update }: { update: ArrivalUpdate }) {
  if (update.told.length === 0 && update.notReached.length === 0) return null

  return (
    <section className="card walk-home-contacts" aria-label="Your contacts">
      {update.told.length > 0 && (
        <div className="walk-home-told">
          <span className="initial" aria-hidden="true">
            {update.told[0].charAt(0).toUpperCase()}
          </span>
          <p>
            <strong>{namesInWords(update.told)}</strong>
            <span className="walk-home-small">Safe-arrival update sent.</span>
          </p>
        </div>
      )}
      {update.notReached.length > 0 && (
        <p className="walk-home-small">
          {namesInWords(update.notReached)} {update.notReached.length === 1 ? 'has' : 'have'}{' '}
          notifications off, so the update could not reach them.
        </p>
      )}
    </section>
  )
}

export default HomeSafeScreen
