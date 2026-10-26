import { useState } from 'react'
import type { PlannedRoute } from '../map/walkRoute.ts'
import RoutePlanner from '../map/RoutePlanner.tsx'
import { isInstalled } from '../../lib/install.ts'
import InstallSheet from './InstallSheet.tsx'
import './home.css'

type HomeProps = {
  displayName: string
  onStartWalk: () => void
  /** Hears which route is on the map, so the walk can show it. */
  onRouteChange: (route: PlannedRoute | null) => void
}

/** Screen 3 of the onboarding v2 wireframe: where the onboarding ends. */
function Home({ displayName, onStartWalk, onRouteChange }: HomeProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  return (
    <main className="screen home-screen">
      <div>
        <p>Hi {displayName}</p>
        <h1>Ready when you are</h1>
      </div>

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
