import { useState } from 'react'
import TopBar from '../../components/TopBar.tsx'
import ContactToggles from '../contacts/ContactToggles.tsx'
import { useContacts } from '../contacts/useContacts.ts'
import { formatDistance, formatMinutes } from '../map/formatRoute.ts'
import type { PlannedRoute } from '../map/walkRoute.ts'
import NotificationCard from '../notifications/NotificationCard.tsx'
import { HOME } from './destination.ts'
import { addMinutes, formatClock } from './time.ts'
import TimerPicker from './TimerPicker.tsx'
import { suggestedMinutes, timerPresets, timerRange } from './timerSuggestion.ts'
import { useNow } from './useNow.ts'
import type { NewWalk } from './walk.ts'
import './walk.css'
import './startWalk.css'

type StartWalkScreenProps = {
  userId: string
  plannedRoute?: PlannedRoute | null
  onStart: (newWalk: NewWalk) => Promise<void>
  onBack: () => void
}

function StartWalkScreen({ userId, plannedRoute = null, onStart, onBack }: StartWalkScreenProps) {
  // Chosen on the Home map. A walk started without a route keeps the old default.
  const destination = plannedRoute?.destinationLabel || HOME
  const routeSeconds = plannedRoute?.seconds ?? null
  const [minutes, setMinutes] = useState(() => suggestedMinutes(routeSeconds))
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const now = useNow()
  const contacts = useContacts(userId)
  const [switchedOffIds, setSwitchedOffIds] = useState<string[]>([])
  const acceptedIds = contacts.contacts
    .filter((contact) => contact.status === 'accepted')
    .map((contact) => contact.id)
  const contactIds = acceptedIds.filter((id) => !switchedOffIds.includes(id))

  async function handleStart() {
    setError(null)
    setIsBusy(true)
    try {
      await onStart({ destinationLabel: destination, minutes, contactIds })
    } catch {
      setError('Could not start the walk. Check your connection and try again.')
      setIsBusy(false)
    }
  }

  return (
    <main className="screen walk-start">
      <TopBar title="Home" onBack={onBack} />
      <h1>Set your check-in</h1>

      <div className="walk-row walk-start-destination">
        <p>
          <span className="small">Going to</span> <strong>{destination}</strong>
        </p>
      </div>

      {plannedRoute && (
        <div className="card walk-estimate">
          <p className="walk-label">Estimated arrival</p>
          <p className="walk-row">
            <strong className="walk-estimate-time">
              {formatClock(addMinutes(now, Math.ceil(plannedRoute.seconds / 60)))}
            </strong>
            <span className="small">
              {formatMinutes(plannedRoute.seconds)} walk · {formatDistance(plannedRoute.metres)}
            </span>
          </p>
        </div>
      )}

      <TimerPicker
        minutes={minutes}
        onChange={setMinutes}
        range={timerRange(routeSeconds)}
        presets={timerPresets(routeSeconds)}
        now={now}
      />

      <ContactToggles
        contacts={contacts.contacts}
        isLoading={contacts.isLoading}
        selectedIds={contactIds}
        onChange={(selectedIds) =>
          setSwitchedOffIds(acceptedIds.filter((id) => !selectedIds.includes(id)))
        }
      />

      {/* Not in the design: "Are you OK?" is a push, and iPhones only ask after a tap. */}
      <NotificationCard
        compact
        reason="WayBack can then warn you if your timer runs out, also when your phone is locked."
      />

      <div className="screen-actions">
        {error && <p role="alert">{error}</p>}
        <button type="button" className="button-primary" disabled={isBusy} onClick={handleStart}>
          Start walk
        </button>
        <p className="small walk-centered">Location is used only while the walk runs.</p>
      </div>
    </main>
  )
}

export default StartWalkScreen
