import { useState } from 'react'
import TabBar, { type Tab } from './components/TabBar.tsx'
import AccountScreen from './features/account/AccountScreen.tsx'
import ActivityScreen from './features/activity/ActivityScreen.tsx'
import { useSession } from './features/auth/SessionContext.ts'
import AcceptInviteScreen from './features/contacts/AcceptInviteScreen.tsx'
import ContactsScreen from './features/contacts/ContactsScreen.tsx'
import { forgetInviteToken, takeInviteToken } from './features/contacts/invites.ts'
import { useInviterName } from './features/contacts/useInviterName.ts'
import { forgetOpenedWalk, takeOpenedWalkId } from './features/followedWalk/followedWalk.ts'
import FollowedWalkScreen from './features/followedWalk/FollowedWalkScreen.tsx'
import Home from './features/home/Home.tsx'

import {
  clearWalkRoute,
  loadWalkRoute,
  loadWalkRouteSeconds,
  saveWalkRoute,
  type PlannedRoute,
} from './features/map/walkRoute.ts'
import NameScreen from './features/onboarding/NameScreen.tsx'
import Welcome from './features/onboarding/Welcome.tsx'
import { useProfile } from './features/profile/useProfile.ts'
import StartWalkScreen from './features/walk/StartWalkScreen.tsx'
import { useWalk } from './features/walk/useWalk.ts'
import { shareWalkRoute } from './features/walk/walk.ts'
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
    cancel: cancelWalk,
    refresh: refreshWalk,
    finish: finishWalk,
  } = useWalk(session?.user.id)
  const [isStartingWalk, setIsStartingWalk] = useState(false)
  const [plannedRoute, setPlannedRoute] = useState<PlannedRoute | null>(null)
  const [openedWalkId, setOpenedWalkId] = useState(takeOpenedWalkId)
  const [inviteToken, setInviteToken] = useState(takeInviteToken)
  const inviterName = useInviterName(isLoading || session ? null : inviteToken)
  const [tab, setTab] = useState<Tab>('places')
  const [isCircleOpen, setIsCircleOpen] = useState(false)
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

  if (!session) return <Welcome notice={logOutNotice} inviterName={inviterName} />

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

  if (!profile.displayName) return <NameScreen onSave={saveName} />

  if (inviteToken) {
    return (
      <AcceptInviteScreen
        token={inviteToken}
        onClose={() => {
          forgetInviteToken()
          setInviteToken(null)
          setTab('contacts')
          setIsCircleOpen(true)
        }}
      />
    )
  }

  // Before the user's own walk: someone may need them now.
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

  if (walk) {
    return (
      <WalkScreen
        walk={walk}
        route={loadWalkRoute(walk.id)}
        routeSeconds={loadWalkRouteSeconds(walk.id)}
        onCheckIn={checkIn}
        onExtend={extendWalk}
        onCancel={async () => {
          await cancelWalk()
          clearWalkRoute()
        }}
        onRefresh={refreshWalk}
        onDone={() => {
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
          if (plannedRoute) {
            saveWalkRoute(startedWalk.id, plannedRoute.coordinates, plannedRoute.seconds)
            // On failure the contacts just see no map.
            shareWalkRoute(startedWalk.id, plannedRoute.coordinates).catch(() => {})
          }
        }}
        onBack={() => setIsStartingWalk(false)}
      />
    )
  }

  return (
    <div className="with-tab-bar">
      {tab === 'places' && (
        <Home
          userId={session.user.id}
          displayName={profile.displayName}
          onStartWalk={() => setIsStartingWalk(true)}
          onRouteChange={setPlannedRoute}
          onOpenContacts={() => {
            setTab('contacts')
            setIsCircleOpen(true)
          }}
        />
      )}
      {tab === 'contacts' &&
        (isCircleOpen ? (
          <ContactsScreen
            userId={session.user.id}
            displayName={profile.displayName}
            onBack={() => setIsCircleOpen(false)}
          />
        ) : (
          <ActivityScreen
            displayName={profile.displayName}
            onOpenWalk={setOpenedWalkId}
            onOpenCircle={() => setIsCircleOpen(true)}
          />
        ))}
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
      <TabBar
        current={tab}
        onChange={(next) => {
          setTab(next)
          setIsCircleOpen(false)
        }}
      />
    </div>
  )
}

export default App
