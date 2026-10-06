import { useState } from 'react'
import { useSession } from './features/auth/SessionContext.ts'
import Home from './features/home/Home.tsx'
import NameScreen from './features/onboarding/NameScreen.tsx'
import Welcome from './features/onboarding/Welcome.tsx'
import { useProfile } from './features/profile/useProfile.ts'
import StartWalkScreen from './features/walk/StartWalkScreen.tsx'
import { useWalk } from './features/walk/useWalk.ts'
import WalkScreen from './features/walk/WalkScreen.tsx'
import { supabase } from './lib/supabase.ts'

function App() {
  const { session, isLoading } = useSession()
  const { profile, error, saveName } = useProfile(session?.user.id)
  const {
    walk,
    isLoading: isWalkLoading,
    error: walkError,
    start: startWalk,
  } = useWalk(session?.user.id)
  const [isStartingWalk, setIsStartingWalk] = useState(false)

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

  if (!session) return <Welcome />

  if (error || walkError) {
    return (
      <main className="screen">
        <p role="alert">{error ?? walkError} Check your connection and reload the page.</p>
      </main>
    )
  }

  if (!profile || isWalkLoading) {
    return (
      <main className="screen">
        <p>Loading…</p>
      </main>
    )
  }

  // A profile without a name means the user has not finished the onboarding yet.
  if (!profile.displayName) return <NameScreen onSave={saveName} />

  // A walk that is running always wins, also after the app was closed and opened again.
  if (walk) return <WalkScreen walk={walk} />

  if (isStartingWalk) {
    return <StartWalkScreen onStart={startWalk} onBack={() => setIsStartingWalk(false)} />
  }

  return <Home displayName={profile.displayName} onStartWalk={() => setIsStartingWalk(true)} />
}

export default App
