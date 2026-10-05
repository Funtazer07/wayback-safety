import { useSession } from './features/auth/SessionContext.ts'
import Home from './features/home/Home.tsx'
import NameScreen from './features/onboarding/NameScreen.tsx'
import Welcome from './features/onboarding/Welcome.tsx'
import { useProfile } from './features/profile/useProfile.ts'
import { supabase } from './lib/supabase.ts'

function App() {
  const { session, isLoading } = useSession()
  const { profile, error, saveName } = useProfile(session?.user.id)

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

  if (error) {
    return (
      <main className="screen">
        <p role="alert">{error} Check your connection and reload the page.</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="screen">
        <p>Loading…</p>
      </main>
    )
  }

  // A profile without a name means the user has not finished the onboarding yet.
  if (!profile.displayName) return <NameScreen onSave={saveName} />

  return <Home displayName={profile.displayName} />
}

export default App
