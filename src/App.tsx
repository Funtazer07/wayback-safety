import { useState } from 'react'
import TabBar, { type Tab } from './components/TabBar.tsx'
import AccountScreen from './features/account/AccountScreen.tsx'
import { useSession } from './features/auth/SessionContext.ts'
import AcceptInviteScreen from './features/contacts/AcceptInviteScreen.tsx'
import ContactsScreen from './features/contacts/ContactsScreen.tsx'
import { forgetInviteToken, takeInviteToken } from './features/contacts/invites.ts'
import { forgetOpenedWalk, takeOpenedWalkId } from './features/followedWalk/followedWalk.ts'
import FollowedWalkScreen from './features/followedWalk/FollowedWalkScreen.tsx'
import Home from './features/home/Home.tsx'

import {
  clearWalkRoute,
  loadWalkRoute,
  saveWalkRoute,
  type PlannedRoute,
} from './features/map/walkRoute.ts'
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
  const [plannedRoute, setPlannedRoute] = useState<PlannedRoute | null>(null)
  // Someone else's walk, when the app was opened from an alert (?walk=<id>, SCRUM-74/102).
  const [openedWalkId, setOpenedWalkId] = useState(takeOpenedWalkId)
  // An invite to become someone's trusted contact (?invite=<secret>, SCRUM-60).
  const [inviteToken, setInviteToken] = useState(takeInviteToken)
  const [tab, setTab] = useState<Tab>('places')
  // Said on the welcome screen after logging out, when alerts could not be stopped (SCRUM-105).
  const [logOutNotice, setLogOutNotice] = useState<string | null>(null)

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

  if (!session) return <Welcome notice={logOutNotice} />

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

  // Someone opened an invite link: answering it comes first, then the contacts list.
  if (inviteToken) {
    return (
      <AcceptInviteScreen
        token={inviteToken}
        onClose={() => {
          forgetInviteToken()
          setInviteToken(null)
          setTab('contacts')
        }}
      />
    )
  }

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
        userId={session.user.id}
        plannedRoute={plannedRoute}
        onStart={async (newWalk) => {
          const startedWalk = await startWalk(newWalk)
          if (plannedRoute) saveWalkRoute(startedWalk.id, plannedRoute.coordinates)
        }}
        onBack={() => setIsStartingWalk(false)}
      />
    )
  }

  // The three tabs of screen 09. A walk, its start screen and the screens above take the whole
  // phone, without the bar.
  return (
    <div className="with-tab-bar">
      {tab === 'places' && (
        <Home
          displayName={profile.displayName}
          onStartWalk={() => setIsStartingWalk(true)}
          onRouteChange={setPlannedRoute}
        />
      )}
      {tab === 'contacts' && (
        <ContactsScreen
          userId={session.user.id}
          displayName={profile.displayName}
          onOpenWalk={setOpenedWalkId}
        />
      )}
      {tab === 'account' && (
        <AccountScreen
          displayName={profile.displayName}
          onLoggingOut={(alertsStopped) =>
            setLogOutNotice(
              alertsStopped
                ? null
                : 'You are logged out, but WayBack could not turn off notifications on this phone. You can turn them off in your phone’s settings.',
            )
          }
        />
      )}
      <TabBar current={tab} onChange={setTab} />
    </div>
  )
}

export default App
