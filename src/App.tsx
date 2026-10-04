import { logOut } from './features/auth/auth.ts'
import AuthScreen from './features/auth/AuthScreen.tsx'
import { useSession } from './features/auth/SessionContext.ts'
import { supabase } from './lib/supabase.ts'

function App() {
  const { session, isLoading } = useSession()

  if (!supabase) {
    return (
      <main>
        <h1>WayBack Safety</h1>
        <p role="alert">The backend is not set up yet. See docs/backend.md.</p>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main>
        <p>Loading…</p>
      </main>
    )
  }

  if (!session) return <AuthScreen />

  return (
    <main>
      <h1>WayBack Safety</h1>
      <p>Logged in as {session.user.email}</p>
      <button type="button" onClick={() => logOut()}>
        Log out
      </button>
    </main>
  )
}

export default App
