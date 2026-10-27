import type { Session } from '@supabase/supabase-js'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import App from './App.tsx'
import { SessionContext } from './features/auth/SessionContext.ts'

const auth = vi.hoisted(() => ({ signInWithOAuth: vi.fn(), signOut: vi.fn() }))
const profile = vi.hoisted(() => ({ fetchProfile: vi.fn(), completeProfile: vi.fn() }))
const walks = vi.hoisted(() => ({
  cancelWalk: vi.fn(),
  checkInWalk: vi.fn(),
  fetchCurrentWalk: vi.fn(),
  fetchWalkContacts: vi.fn(),
  fetchWalkWatchers: vi.fn(),
  shareWalkRoute: vi.fn(),
  startWalk: vi.fn(),
  updateWalkLocation: vi.fn(),
}))

function walkEndingIn(minutes: number) {
  return {
    id: 'walk-1',
    destinationLabel: 'Home',
    startedAt: new Date(),
    deadline: new Date(Date.now() + minutes * 60_000),
    status: 'active',
  }
}

// Stand-ins for the real backend, so the tests never talk to Supabase.
vi.mock('./lib/supabase.ts', () => ({ supabase: { auth } }))
vi.mock('./features/profile/profile.ts', () => profile)
vi.mock('./features/walk/walk.ts', () => walks)
const contactsApi = vi.hoisted(() => ({
  fetchContacts: vi.fn(),
  fetchAlertStatus: vi.fn(),
  fetchInvite: vi.fn(),
  acceptInvite: vi.fn(),
  declineInvite: vi.fn(),
}))
vi.mock('./features/contacts/contacts.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./features/contacts/contacts.ts')>()),
  ...contactsApi,
}))
const followed = vi.hoisted(() => ({ fetchFollowedWalk: vi.fn(), fetchContactWalks: vi.fn() }))
vi.mock('./features/followedWalk/followedWalk.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./features/followedWalk/followedWalk.ts')>()),
  ...followed,
}))
// The map needs a real browser; it has its own tests in features/map.
// A route chosen on Home, from Stratumseind to the station.
const routeViaStratumseind = vi.hoisted((): [number, number][] => [
  [5.4791, 51.4385],
  [5.4794, 51.4409],
  [5.4797, 51.4433],
])
// The Home map's stand-in has a button that chooses a route, and the walk map's stand-in says
// which route it got.
vi.mock('./features/map/RoutePlanner.tsx', () => ({
  default: ({
    onRouteChange,
  }: {
    onRouteChange: (route: {
      coordinates: [number, number][]
      seconds: number
      metres: number
    }) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onRouteChange({ coordinates: routeViaStratumseind, seconds: 1500, metres: 1900 })
      }
    >
      Choose the route via Stratumseind
    </button>
  ),
}))
vi.mock('./features/map/WalkMap.tsx', () => ({
  default: ({ route }: { route: [number, number][] | null }) => (
    <p>{route ? `Map shows a route of ${route.length} points` : 'Map shows no route'}</p>
  ),
}))

const loggedIn = { user: { id: 'user-1' } } as Session

function renderApp(session: Session | null, isLoading = false) {
  render(
    <SessionContext value={{ session, isLoading }}>
      <App />
    </SessionContext>,
  )
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  auth.signInWithOAuth.mockResolvedValue({ error: null })
  profile.fetchProfile.mockResolvedValue({ displayName: null })
  profile.completeProfile.mockResolvedValue(undefined)
  walks.fetchCurrentWalk.mockResolvedValue(null)
  walks.fetchWalkContacts.mockResolvedValue([])
  walks.fetchWalkWatchers.mockResolvedValue([])
  contactsApi.fetchContacts.mockResolvedValue([])
  contactsApi.fetchAlertStatus.mockResolvedValue(new Map())
  followed.fetchContactWalks.mockResolvedValue([])
})

test('a new visitor can sign in with Google from the welcome screen', async () => {
  renderApp(null)
  expect(screen.getByRole('heading', { name: 'Get home safe, your way' })).toBeInTheDocument()

  click('Continue with Google')

  await vi.waitFor(() =>
    expect(auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    ),
  )
})

test('people without a Google account can use email instead', () => {
  renderApp(null)

  click('Use email instead')

  expect(screen.getByRole('heading', { name: 'Sign up with email' })).toBeInTheDocument()
})

test('shows the error when signing in fails', async () => {
  auth.signInWithOAuth.mockResolvedValue({ error: new Error('Provider is not enabled') })
  renderApp(null)

  click('Continue with Google')

  expect(await screen.findByRole('alert')).toHaveTextContent('Provider is not enabled')
})

test('after the first sign-in the user gives a name and lands on Home', async () => {
  renderApp(loggedIn)
  expect(await screen.findByRole('heading', { name: 'What should we call you?' })).toBeVisible()

  fireEvent.change(screen.getByLabelText('First name or nickname'), { target: { value: ' Sam ' } })
  fireEvent.click(screen.getByLabelText('I am 16 or older'))
  click('Continue')

  expect(await screen.findByText('Hi Sam')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Ready when you are' })).toBeInTheDocument()
  expect(profile.completeProfile).toHaveBeenCalledWith('user-1', 'Sam')
})

test('the name is not saved until the age is confirmed', async () => {
  renderApp(loggedIn)
  await screen.findByRole('heading', { name: 'What should we call you?' })

  fireEvent.change(screen.getByLabelText('First name or nickname'), { target: { value: 'Sam' } })
  click('Continue')

  expect(profile.completeProfile).not.toHaveBeenCalled()
})

test('a returning user goes straight to Home', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })

  renderApp(loggedIn)

  expect(await screen.findByText('Hi Sam')).toBeInTheDocument()
})

test('shows a message when the profile cannot be loaded', async () => {
  profile.fetchProfile.mockRejectedValue(new Error('network'))

  renderApp(loggedIn)

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your profile.')
})

test('a user starts a walk home with the timer they picked', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  walks.startWalk.mockResolvedValue(walkEndingIn(25))
  renderApp(loggedIn)
  await screen.findByText('Hi Sam')

  click('Start walk')
  expect(screen.getByRole('heading', { name: 'Set your check-in' })).toBeInTheDocument()
  fireEvent.change(screen.getByRole('slider', { name: 'Walk timer in minutes' }), {
    target: { value: '25' },
  })
  click('Start walk')

  const walkPanel = await screen.findByRole('region', { name: 'Your walk' })
  expect(within(walkPanel).getByText('Walking to')).toBeInTheDocument()
  expect(within(walkPanel).getByText('Home')).toBeInTheDocument()
  expect(screen.getByRole('timer')).toHaveAccessibleName('25 min left')
  expect(walks.startWalk).toHaveBeenCalledWith({
    destinationLabel: 'Home',
    minutes: 25,
    contactIds: [],
  })
})

test('a timer from an hour up is shown in hours and minutes', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  renderApp(loggedIn)
  await screen.findByText('Hi Sam')

  click('Start walk')
  // From the default 20 minutes to 65.
  fireEvent.change(screen.getByRole('slider', { name: 'Walk timer in minutes' }), {
    target: { value: '65' },
  })

  expect(screen.getByText('1 h 5 min')).toBeInTheDocument()
})

test('a user can walk to a typed address instead of Home', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  walks.startWalk.mockResolvedValue(walkEndingIn(20))
  renderApp(loggedIn)
  await screen.findByText('Hi Sam')

  click('Start walk')
  click('Change')
  fireEvent.change(screen.getByLabelText('Or type an address'), {
    target: { value: 'Kruisstraat 12, Eindhoven' },
  })
  click('Use this place')
  click('Start walk')

  await vi.waitFor(() =>
    expect(walks.startWalk).toHaveBeenCalledWith({
      destinationLabel: 'Kruisstraat 12, Eindhoven',
      minutes: 20,
      contactIds: [],
    }),
  )
})

test('shows a message when the walk cannot be started', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  walks.startWalk.mockRejectedValue(new Error('network'))
  renderApp(loggedIn)
  await screen.findByText('Hi Sam')

  click('Start walk')
  click('Start walk')

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not start the walk.')
})

test('a walk that is still running is shown again when the app is reopened', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  walks.fetchCurrentWalk.mockResolvedValue(walkEndingIn(14))

  renderApp(loggedIn)

  expect(await screen.findByRole('timer')).toHaveAccessibleName('14 min left')
  expect(screen.queryByText('Hi Sam')).not.toBeInTheDocument()
})

test('a user checks in with "I’m home" and is back on Home after the "You’re home" screen', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  const walk = walkEndingIn(14)
  walks.fetchCurrentWalk.mockResolvedValue(walk)
  walks.checkInWalk.mockResolvedValue({ ...walk, status: 'safe' })
  renderApp(loggedIn)
  await screen.findByRole('timer')

  click('I’m home')

  expect(await screen.findByRole('heading', { name: 'You’re home.' })).toBeInTheDocument()
  expect(walks.checkInWalk).toHaveBeenCalledWith('walk-1')

  click('Back to your places')

  expect(await screen.findByText('Hi Sam')).toBeInTheDocument()
  expect(screen.queryByRole('timer')).not.toBeInTheDocument()
})

test('the route chosen on Home is on the walk map after the walk starts', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  walks.startWalk.mockResolvedValue(walkEndingIn(20))
  renderApp(loggedIn)
  await screen.findByText('Hi Sam')

  click('Choose the route via Stratumseind')
  click('Start walk')
  // A 25-minute route: the timer starts at 25 + 5 minutes extra.
  expect(screen.getByText('30 min', { selector: 'strong' })).toBeInTheDocument()
  click('Start walk')

  expect(await screen.findByText('Map shows a route of 3 points')).toBeInTheDocument()
  expect(walks.startWalk).toHaveBeenCalledWith(expect.objectContaining({ minutes: 30 }))
  // The contacts see the same route on their screen.
  expect(walks.shareWalkRoute).toHaveBeenCalledWith('walk-1', routeViaStratumseind)
})

test('a walk still starts when sharing the route with the contacts fails', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  walks.startWalk.mockResolvedValue(walkEndingIn(20))
  walks.shareWalkRoute.mockRejectedValue(new Error('network'))
  renderApp(loggedIn)
  await screen.findByText('Hi Sam')

  click('Choose the route via Stratumseind')
  click('Start walk')
  click('Start walk')

  expect(await screen.findByText('Map shows a route of 3 points')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('a walk started without a route shows no route', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  walks.startWalk.mockResolvedValue(walkEndingIn(20))
  renderApp(loggedIn)
  await screen.findByText('Hi Sam')

  click('Start walk')
  click('Start walk')

  expect(await screen.findByText('Map shows no route')).toBeInTheDocument()
  expect(walks.shareWalkRoute).not.toHaveBeenCalled()
})

test('the route is still on the walk map when the app is opened again during the walk', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  walks.fetchCurrentWalk.mockResolvedValue(walkEndingIn(14))
  localStorage.setItem(
    'wayback.walkRoute',
    JSON.stringify({ walkId: 'walk-1', coordinates: routeViaStratumseind }),
  )

  renderApp(loggedIn)

  expect(await screen.findByText('Map shows a route of 3 points')).toBeInTheDocument()
})

test('the route of a walk is erased once the user is home', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  const walk = walkEndingIn(14)
  walks.fetchCurrentWalk.mockResolvedValue(walk)
  walks.checkInWalk.mockResolvedValue({ ...walk, status: 'safe' })
  localStorage.setItem(
    'wayback.walkRoute',
    JSON.stringify({ walkId: 'walk-1', coordinates: routeViaStratumseind }),
  )
  renderApp(loggedIn)
  await screen.findByRole('timer')

  click('I’m home')
  await screen.findByRole('heading', { name: 'You’re home.' })
  click('Back to your places')

  await screen.findByText('Hi Sam')
  expect(localStorage.getItem('wayback.walkRoute')).toBeNull()
})

test('opening the app from an alert shows that walk to the contact, and Back leads Home', async () => {
  window.history.replaceState(null, '', '/?walk=554f1173-05c1-496b-8481-77df511e55de')
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  followed.fetchFollowedWalk.mockResolvedValue({
    walkerName: 'Anna',
    status: 'safe',
    deadline: new Date(),
    overdueAt: new Date(),
    checkedInAt: new Date(),
    cancelledAt: null,
    lastLocation: null,
  })
  renderApp(loggedIn)

  expect(await screen.findByRole('heading', { name: 'Anna is safe' })).toBeInTheDocument()
  expect(followed.fetchFollowedWalk).toHaveBeenCalledWith('554f1173-05c1-496b-8481-77df511e55de')

  click('Back')

  expect(screen.queryByRole('heading', { name: 'Anna is safe' })).not.toBeInTheDocument()
})

test('an overdue walk in Activity opens, and Back leads to Activity again', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  contactsApi.fetchContacts.mockResolvedValue([
    { id: 'c-anna', label: 'Anna', status: 'accepted', inviteExpiresAt: null },
  ])
  followed.fetchContactWalks.mockResolvedValue([
    {
      walkId: 'walk-anna',
      walkerName: 'Anna',
      contactId: 'c-anna',
      status: 'overdue',
      startedAt: new Date(),
      deadline: new Date(),
      overdueAt: new Date(),
      checkedInAt: null,
      cancelledAt: null,
    },
  ])
  followed.fetchFollowedWalk.mockResolvedValue({
    walkerName: 'Anna',
    status: 'safe',
    deadline: new Date(),
    overdueAt: new Date(),
    checkedInAt: new Date(),
    cancelledAt: null,
    lastLocation: null,
  })
  renderApp(loggedIn)
  await screen.findByRole('heading', { name: 'Ready when you are' })

  click('Contacts')
  fireEvent.click(await screen.findByRole('button', { name: /Anna hasn’t checked in/ }))

  expect(await screen.findByRole('heading', { name: 'Anna is safe' })).toBeInTheDocument()
  expect(followed.fetchFollowedWalk).toHaveBeenCalledWith('walk-anna')
  click('Back')
  expect(await screen.findByRole('heading', { name: 'Activity' })).toBeInTheDocument()
})

test('the bottom bar switches between Places, Contacts and Account', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Anna' })
  renderApp(loggedIn)
  expect(await screen.findByRole('heading', { name: 'Ready when you are' })).toBeInTheDocument()

  click('Contacts')
  expect(await screen.findByRole('heading', { name: 'Activity' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Contacts' })).toHaveAttribute('aria-current', 'page')
  // Trusted contacts is one step in, with Back to Activity.
  fireEvent.click(screen.getByRole('button', { name: /Trusted contacts/ }))
  expect(await screen.findByRole('heading', { name: 'Trusted contacts' })).toBeInTheDocument()
  click('Back')
  expect(screen.getByRole('heading', { name: 'Activity' })).toBeInTheDocument()

  click('Account')
  expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()

  click('Places')
  expect(screen.getByRole('heading', { name: 'Ready when you are' })).toBeInTheDocument()
})

test('opening an invite link asks the contact to accept, then shows their contacts', async () => {
  window.history.replaceState(null, '', '/?invite=0ddc2e61-c2a8-4dc4-9586-6656c2bdc63a')
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  contactsApi.fetchInvite.mockResolvedValue({ inviterName: 'Anna', expiresAt: new Date() })
  contactsApi.declineInvite.mockResolvedValue(undefined)
  renderApp(loggedIn)

  expect(await screen.findByRole('heading', { name: 'Anna invited you' })).toBeInTheDocument()
  click('Decline')

  expect(await screen.findByRole('heading', { name: 'Trusted contacts' })).toBeInTheDocument()
})

test('a walk is started with the contacts who are switched on', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Anna' })
  contactsApi.fetchContacts.mockResolvedValue([
    { id: 'c-mum', label: 'Mum', status: 'accepted', inviteExpiresAt: null },
    { id: 'c-alex', label: 'Alex', status: 'accepted', inviteExpiresAt: null },
  ])
  walks.startWalk.mockResolvedValue(walkEndingIn(20))
  renderApp(loggedIn)

  await screen.findByRole('heading', { name: 'Ready when you are' })
  click('Start walk')
  fireEvent.click(await screen.findByRole('switch', { name: 'Alex' }))
  click('Start walk')

  await vi.waitFor(() =>
    expect(walks.startWalk).toHaveBeenCalledWith(
      expect.objectContaining({ contactIds: ['c-mum'] }),
    ),
  )
})

test('cancelling a walk asks first, then goes back Home and forgets the route', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  const walk = walkEndingIn(14)
  walks.fetchCurrentWalk.mockResolvedValue(walk)
  walks.cancelWalk.mockResolvedValue({ ...walk, status: 'cancelled' })
  localStorage.setItem(
    'wayback.walkRoute',
    JSON.stringify({ walkId: 'walk-1', coordinates: routeViaStratumseind, seconds: 600 }),
  )
  renderApp(loggedIn)
  await screen.findByRole('timer')

  click('Cancel walk')
  fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }))

  expect(await screen.findByText('Hi Sam')).toBeInTheDocument()
  expect(walks.cancelWalk).toHaveBeenCalledWith('walk-1')
  expect(localStorage.getItem('wayback.walkRoute')).toBeNull()
})
