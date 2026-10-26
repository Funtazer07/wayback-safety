import { useState } from 'react'
import TopBar from '../../components/TopBar.tsx'
import ContactToggles from '../contacts/ContactToggles.tsx'
import { useContacts } from '../contacts/useContacts.ts'
import { formatDistance } from '../map/formatRoute.ts'
import type { PlannedRoute } from '../map/walkRoute.ts'
import NotificationCard from '../notifications/NotificationCard.tsx'
import { HOME } from './destination.ts'
import DestinationSheet from './DestinationSheet.tsx'
import { addMinutes, formatClock } from './time.ts'
import TimerPicker from './TimerPicker.tsx'
import { useNow } from './useNow.ts'
import type { NewWalk } from './walk.ts'
import './walk.css'

type StartWalkScreenProps = {
  /** The logged-in user, to list their trusted contacts. */
  userId: string
  /** The route planned on Home, for the estimated arrival. Null when none was planned. */
  plannedRoute?: PlannedRoute | null
  onStart: (newWalk: NewWalk) => Promise<void>
  onBack: () => void
}

// Assumption: the design shows 20 min as the starting value.
const DEFAULT_MINUTES = 20

/** Screen 04 of the prototype, "Set your check-in": the timer and who hears about the walk. */
function StartWalkScreen({ userId, plannedRoute = null, onStart, onBack }: StartWalkScreenProps) {
  const [destination, setDestination] = useState(HOME)
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const now = useNow()
  // Every contact who accepted follows the walk, as on screen 04, unless the user switches them off.
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
    <main className="screen">
      <TopBar title="Home" onBack={onBack} />
      <h1>Set your check-in</h1>

      <div className="card walk-row">
        <p>
          <span className="small">Going to</span> <strong>{destination}</strong>
        </p>
        <button type="button" className="button-link" onClick={() => setIsSheetOpen(true)}>
          Change
        </button>
      </div>

      {/* From the route planned on Home. Without one the app cannot estimate the walk, so the
          card is left out instead of guessing. */}
      {plannedRoute && (
        <div className="card walk-estimate">
          <p className="walk-label">Estimated arrival</p>
          <p className="walk-row">
            <strong className="walk-estimate-time">
              {formatClock(addMinutes(now, Math.ceil(plannedRoute.seconds / 60)))}
            </strong>
            <span className="small">
              {Math.max(1, Math.round(plannedRoute.seconds / 60))} min walk ·{' '}
              {formatDistance(plannedRoute.metres)}
            </span>
          </p>
        </div>
      )}

      <TimerPicker minutes={minutes} onChange={setMinutes} now={now} />

      <ContactToggles
        contacts={contacts.contacts}
        isLoading={contacts.isLoading}
        selectedIds={contactIds}
        onChange={(selectedIds) =>
          setSwitchedOffIds(acceptedIds.filter((id) => !selectedIds.includes(id)))
        }
      />

      {/* Not in the design. Asked here because the warning when time runs out (SCRUM-73) is a
          push notification, and iPhones only ask after a tap (SCRUM-68). */}
      <NotificationCard reason="WayBack can then warn you if your timer runs out, also when your phone is locked." />

      <div className="screen-actions">
        {error && <p role="alert">{error}</p>}
        <button type="button" className="button-primary" disabled={isBusy} onClick={handleStart}>
          Start walk
        </button>
        <p className="small walk-centered">Location is used only while the walk runs.</p>
      </div>

      {isSheetOpen && (
        <DestinationSheet
          destination={destination}
          onUse={(place) => {
            setDestination(place)
            setIsSheetOpen(false)
          }}
          onClose={() => setIsSheetOpen(false)}
        />
      )}
    </main>
  )
}

export default StartWalkScreen
