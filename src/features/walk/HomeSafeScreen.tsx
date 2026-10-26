import type { ArrivalUpdate } from './arrival.ts'
import { namesInWords } from './grace.ts'
import { formatClock } from './time.ts'
import { useArrivalUpdate } from './useArrivalUpdate.ts'
import './checkIn.css'

type HomeSafeScreenProps = {
  walkId: string
  /** When the user checked in. */
  endedAt: Date
  /** Back to Home ("your places"). */
  onDone: () => void
}

// The three things the check-in did, from screen 12. Each one is true the moment the server
// answers: the walk is 'safe', the location is erased (0004) and the check-in time is saved.
const doneSteps = ['Timer stopped', 'Location sharing stopped', 'Check-in saved']

/**
 * Screen 12 of the prototype (SCRUM-106): the walk has ended, and who was told. Replaces the small
 * message that was shown over the walk screen before.
 */
function HomeSafeScreen({ walkId, endedAt, onDone }: HomeSafeScreenProps) {
  const update = useArrivalUpdate(walkId)

  return (
    <main className="screen walk-home">
      <svg className="walk-home-mark" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M13 33 26 46 52 17" />
      </svg>
      <div>
        <h1>You’re home.</h1>
        <p>Your walk ended at {formatClock(endedAt)}.</p>
      </div>

      <ul className="walk-home-steps" aria-label="What the check-in did">
        {doneSteps.map((step) => (
          <li key={step}>
            <span aria-hidden="true">✓ </span>
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

/**
 * "Mum & Alex · Safe-arrival update sent". The design says "delivered", but the app cannot know
 * that a phone showed the message, only that it was sent, so it says "sent". Left out when the
 * walk had no contacts.
 */
function ContactsTold({ update }: { update: ArrivalUpdate }) {
  if (update.told.length === 0 && update.notReached.length === 0) return null

  return (
    <section className="card" aria-label="Your contacts">
      {update.told.length > 0 && (
        <p>
          <strong>{namesInWords(update.told)}</strong>
          <span className="walk-home-small">Safe-arrival update sent.</span>
        </p>
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
