import { useState } from 'react'
import type { PlannedRoute } from '../map/walkRoute.ts'
import RoutePlanner from '../map/RoutePlanner.tsx'
import { isInstalled } from '../../lib/install.ts'
import NewContactsCard from '../contacts/NewContactsCard.tsx'
import InstallSheet from './InstallSheet.tsx'
import './home.css'

type HomeProps = {
  userId: string
  displayName: string
  onStartWalk: () => void
  onRouteChange: (route: PlannedRoute | null) => void
  onOpenContacts: () => void
}

function Home({ userId, displayName, onStartWalk, onRouteChange, onOpenContacts }: HomeProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  return (
    <main className="screen home-screen">
      <div>
        <p>Hi {displayName}</p>
        <h1>Ready when you are</h1>
      </div>

      <NewContactsCard userId={userId} onOpenContacts={onOpenContacts} />

      {!isInstalled() && (
        <div className="home-banner">
          <p>Add WayBack to your home screen for a one-tap start.</p>
          <button type="button" className="button-link" onClick={() => setIsSheetOpen(true)}>
            Show me how
          </button>
        </div>
      )}

      <RoutePlanner onRouteChange={onRouteChange} />

      <div className="screen-actions">
        <button type="button" className="button-primary" onClick={onStartWalk}>
          Start walk
        </button>
      </div>

      {isSheetOpen && <InstallSheet onClose={() => setIsSheetOpen(false)} />}
    </main>
  )
}

export default Home
