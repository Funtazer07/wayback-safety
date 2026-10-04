import type { Session } from '@supabase/supabase-js'
import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import App from './App.tsx'
import { SessionContext } from './features/auth/SessionContext.ts'

// A stand-in for the real backend, so the tests never talk to Supabase.
vi.mock('./lib/supabase.ts', () => ({ supabase: { auth: {} } }))

function renderApp(session: Session | null, isLoading = false) {
  render(
    <SessionContext value={{ session, isLoading }}>
      <App />
    </SessionContext>,
  )
}

test('shows the sign-up screen when logged out', () => {
  renderApp(null)

  expect(screen.getByRole('heading', { name: 'Sign up' })).toBeInTheDocument()
})

test('shows who is logged in', () => {
  renderApp({ user: { email: 'sanne@example.com' } } as Session)

  expect(screen.getByText('Logged in as sanne@example.com')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
})

test('shows a loading message while the session is being restored', () => {
  renderApp(null, true)

  expect(screen.getByText('Loading…')).toBeInTheDocument()
})
