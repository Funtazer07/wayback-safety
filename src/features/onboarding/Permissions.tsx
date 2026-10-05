import { useState } from 'react'
import ProgressDots from '../../components/ProgressDots.tsx'
import { requestLocationPermission } from './requestLocationPermission.ts'

type PermissionsProps = {
  onNext: () => void
}

function Permissions({ onNext }: PermissionsProps) {
  const [isAsking, setIsAsking] = useState(false)

  async function handleAllow() {
    setIsAsking(true)
    await requestLocationPermission()
    onNext()
  }

  return (
    <main className="screen">
      <ProgressDots step={4} />
      <h1>Before your first walk</h1>
      <p>Your phone will ask next. Here is why we need it.</p>

      <section className="card">
        <h2>Location</h2>
        <p>
          Used only while a walk is running. It lets the app see when you reach home, and lets your
          contacts see where you are if you do not arrive. It stops when the walk ends. You can
          switch it off in settings.
        </p>
      </section>

      {/* Notifications are explained here but not asked for yet: the phone's question comes when
          timer reminders are built, so users are not asked for something the app does not use. */}
      <section className="card">
        <h2>Notifications</h2>
        <p>Reminders when your timer is almost up.</p>
      </section>

      <div className="screen-actions">
        <button type="button" className="button-primary" disabled={isAsking} onClick={handleAllow}>
          Allow location while using the app
        </button>
        <button type="button" disabled={isAsking} onClick={onNext}>
          Not now
        </button>
      </div>
    </main>
  )
}

export default Permissions
