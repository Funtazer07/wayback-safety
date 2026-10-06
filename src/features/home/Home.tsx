import { useState } from 'react'
import { logOut } from '../auth/auth.ts'
import { isInstalled } from './install.ts'
import InstallSheet from './InstallSheet.tsx'
import './home.css'

type HomeProps = {
  displayName: string
  onStartWalk: () => void
}

/** Screen 3 of the onboarding v2 wireframe: where the onboarding ends. */
function Home({ displayName, onStartWalk }: HomeProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  return (
    <main className="screen">
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

      <div className="screen-actions">
        <button type="button" className="button-primary" onClick={onStartWalk}>
          Start walk
        </button>
        {/* Not in the wireframe: without it there is no way to switch accounts while testing. */}
        <button type="button" className="button-link" onClick={() => logOut()}>
          Log out
        </button>
      </div>

      {isSheetOpen && <InstallSheet onClose={() => setIsSheetOpen(false)} />}
    </main>
  )
}

export default Home
