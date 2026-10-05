import type { Session } from '@supabase/supabase-js'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import App from './App.tsx'
import { SessionContext } from './features/auth/SessionContext.ts'

// A stand-in for the real backend, so the tests never talk to Supabase.
vi.mock('./lib/supabase.ts', () => ({ supabase: { auth: {} } }))

const loggedIn = { user: { email: 'sanne@example.com' } } as Session

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
  localStorage.clear()
})

test('a new visitor walks through welcome, how it works and sign-up', () => {
  renderApp(null)
  expect(screen.getByRole('heading', { name: 'Get home safe, your way' })).toBeInTheDocument()

  click('Get started')
  expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument()

  click('Next')
  expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
})

test('someone with an account can go straight to logging in', () => {
  renderApp(null)

  click('I already have an account')

  expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
})

test('after signing up, permissions and installing are explained once', () => {
  renderApp(loggedIn)
  expect(screen.getByRole('heading', { name: 'Before your first walk' })).toBeInTheDocument()

  click('Not now')
  expect(
    screen.getByRole('heading', { name: 'Add WayBack to your home screen' }),
  ).toBeInTheDocument()

  click('Done, start my first walk')
  expect(screen.getByText('Logged in as sanne@example.com')).toBeInTheDocument()
  expect(localStorage.getItem('wayback.onboardingDone')).toBe('true')
})

test('the onboarding is not shown again on a phone that finished it', () => {
  localStorage.setItem('wayback.onboardingDone', 'true')

  renderApp(loggedIn)

  expect(screen.getByText('Logged in as sanne@example.com')).toBeInTheDocument()
})

test('shows a loading message while the session is being restored', () => {
  renderApp(null, true)

  expect(screen.getByText('Loading…')).toBeInTheDocument()
})
