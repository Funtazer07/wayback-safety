import type { Session } from '@supabase/supabase-js'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import App from './App.tsx'
import { SessionContext } from './features/auth/SessionContext.ts'

const auth = vi.hoisted(() => ({ signInWithOAuth: vi.fn(), signOut: vi.fn() }))
const profile = vi.hoisted(() => ({ fetchProfile: vi.fn(), completeProfile: vi.fn() }))

// Stand-ins for the real backend, so the tests never talk to Supabase.
vi.mock('./lib/supabase.ts', () => ({ supabase: { auth } }))
vi.mock('./features/profile/profile.ts', () => profile)

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
