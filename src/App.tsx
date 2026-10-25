import { useState } from 'react'
import { useSession } from './features/auth/SessionContext.ts'
import { forgetOpenedWalk, takeOpenedWalkId } from './features/followedWalk/followedWalk.ts'
import FollowedWalkScreen from './features/followedWalk/FollowedWalkScreen.tsx'
import Home from './features/home/Home.tsx'
import type { LngLat } from './features/map/geometry.ts'
import { clearWalkRoute, loadWalkRoute, saveWalkRoute } from './features/map/walkRoute.ts'
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
    checkIn,
    extend: extendWalk,
    refresh: refreshWalk,
    finish: finishWalk,
  } = useWalk(session?.user.id)
  const [isStartingWalk, setIsStartingWalk] = useState(false)
  // The route on the Home map. When a walk starts, it is kept with that walk for the walk screen.
  const [plannedRoute, setPlannedRoute] = useState<LngLat[] | null>(null)
  // Someone else's walk, when the app was opened from an alert (?walk=<id>, SCRUM-74/102).
  const [openedWalkId, setOpenedWalkId] = useState(takeOpenedWalkId)

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

  // A contact who tapped an alert sees that walk first, also if they are on a walk themselves:
  // someone may need them now. Back leads to their own screens.
  if (openedWalkId) {
    return (
      <FollowedWalkScreen
        walkId={openedWalkId}
        onClose={() => {
          forgetOpenedWalk()
          setOpenedWalkId(null)
        }}
      />
    )
  }

  // A walk that is running always wins, also after the app was closed and opened again. A walk
  // that was just checked in stays on screen until the user closes the confirmation.
  if (walk) {
    return (
      <WalkScreen
        walk={walk}
        route={loadWalkRoute(walk.id)}
        onCheckIn={checkIn}
        onExtend={extendWalk}
        onRefresh={refreshWalk}
        onDone={() => {
          // The walk is over: its route is not needed any more.
          clearWalkRoute()
          finishWalk()
        }}
      />
    )
  }

  if (isStartingWalk) {
    return (
      <StartWalkScreen
        onStart={async (newWalk) => {
          const startedWalk = await startWalk(newWalk)
          if (plannedRoute) saveWalkRoute(startedWalk.id, plannedRoute)
        }}
        onBack={() => setIsStartingWalk(false)}
      />
    )
  }

  return (
    <Home
      displayName={profile.displayName}
      onStartWalk={() => setIsStartingWalk(true)}
      onRouteChange={setPlannedRoute}
    />
  )
}

export default App
