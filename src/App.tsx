import { useState } from 'react'
import { logOut } from './features/auth/auth.ts'
import { useSession } from './features/auth/SessionContext.ts'
import FirstRun from './features/onboarding/FirstRun.tsx'
import Onboarding from './features/onboarding/Onboarding.tsx'
import { isOnboardingDone, markOnboardingDone } from './features/onboarding/onboardingStorage.ts'
import { supabase } from './lib/supabase.ts'

function App() {
  const { session, isLoading } = useSession()
  const [isOnboarded, setIsOnboarded] = useState(isOnboardingDone)

  function finishOnboarding() {
    markOnboardingDone()
    setIsOnboarded(true)
  }

  if (!supabase) {
    return (
      <main className="screen">
        <h1>WayBack Safety</h1>
        <p role="alert">The backend is not set up yet. See docs/backend.md.</p>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="screen">
        <p>Loading…</p>
      </main>
    )
  }

  if (!session) return <Onboarding onExistingUserLogin={finishOnboarding} />

  if (!isOnboarded) return <FirstRun onDone={finishOnboarding} />

  // Placeholder home screen until the walk screens are built (SCRUM-44).
  return (
    <main className="screen">
      <h1>WayBack Safety</h1>
      <p>Logged in as {session.user.email}</p>
      <div className="screen-actions">
        <button type="button" onClick={() => logOut()}>
          Log out
        </button>
      </div>
    </main>
  )
}

export default App
