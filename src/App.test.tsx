import type { Session } from '@supabase/supabase-js'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import App from './App.tsx'
import { SessionContext } from './features/auth/SessionContext.ts'

const auth = vi.hoisted(() => ({ signInWithOAuth: vi.fn(), signOut: vi.fn() }))
const profile = vi.hoisted(() => ({ fetchProfile: vi.fn(), completeProfile: vi.fn() }))
const walks = vi.hoisted(() => ({
  checkInWalk: vi.fn(),
  fetchActiveWalk: vi.fn(),
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
// The map needs a real browser; it has its own tests in features/map.
vi.mock('./features/map/CityMap.tsx', () => ({ default: () => null }))

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
  auth.signInWithOAuth.mockResolvedValue({ error: null })
  profile.fetchProfile.mockResolvedValue({ displayName: null })
  profile.completeProfile.mockResolvedValue(undefined)
  walks.fetchActiveWalk.mockResolvedValue(null)
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
  expect(screen.getByRole('heading', { name: 'Start a walk' })).toBeInTheDocument()
  click('5 minutes more')
  click('Start walk')

  const walkPanel = await screen.findByRole('region', { name: 'Your walk' })
  expect(within(walkPanel).getByText('Walking to')).toBeInTheDocument()
  expect(within(walkPanel).getByText('Home')).toBeInTheDocument()
  expect(screen.getByRole('timer')).toHaveAccessibleName('25 min left')
  expect(walks.startWalk).toHaveBeenCalledWith({ destinationLabel: 'Home', minutes: 25 })
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
  walks.fetchActiveWalk.mockResolvedValue(walkEndingIn(14))

  renderApp(loggedIn)

  expect(await screen.findByRole('timer')).toHaveAccessibleName('14 min left')
  expect(screen.queryByText('Hi Sam')).not.toBeInTheDocument()
})

test('a user checks in with "I’m home" and is back on Home after the confirmation', async () => {
  profile.fetchProfile.mockResolvedValue({ displayName: 'Sam' })
  const walk = walkEndingIn(14)
  walks.fetchActiveWalk.mockResolvedValue(walk)
  walks.checkInWalk.mockResolvedValue({ ...walk, status: 'safe' })
  renderApp(loggedIn)
  await screen.findByRole('timer')

  click('I’m home')

  expect(await screen.findByRole('dialog', { name: 'You arrived safely!' })).toBeVisible()
  expect(walks.checkInWalk).toHaveBeenCalledWith('walk-1')

  click('OK')

  expect(await screen.findByText('Hi Sam')).toBeInTheDocument()
  expect(screen.queryByRole('timer')).not.toBeInTheDocument()
})
