import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import EmailScreen from './EmailScreen.tsx'

const auth = vi.hoisted(() => ({ signUp: vi.fn(), signInWithPassword: vi.fn() }))

// A stand-in for the real backend, so the tests never talk to Supabase.
vi.mock('../../lib/supabase.ts', () => ({ supabase: { auth } }))

beforeEach(() => {
  vi.clearAllMocks()
  auth.signUp.mockResolvedValue({ data: { session: {} }, error: null })
  auth.signInWithPassword.mockResolvedValue({ error: null })
})

function fillIn(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

test('creates an account with email and password', async () => {
  render(<EmailScreen onBack={() => {}} />)

  fillIn('Email', 'sanne@example.com')
  fillIn('Password', 'long-enough-password')
  click('Create account')

  await vi.waitFor(() =>
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'sanne@example.com', password: 'long-enough-password' }),
    ),
  )
})

test('asks to confirm the email address when the backend requires it', async () => {
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
  render(<EmailScreen onBack={() => {}} />)

  fillIn('Email', 'sanne@example.com')
  fillIn('Password', 'long-enough-password')
  click('Create account')

  expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
})

test('someone with an account can log in', async () => {
  render(<EmailScreen onBack={() => {}} />)

  click('I already have an account')
  fillIn('Email', 'sanne@example.com')
  fillIn('Password', 'long-enough-password')
  click('Log in')

  await vi.waitFor(() =>
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'sanne@example.com',
      password: 'long-enough-password',
    }),
  )
  expect(auth.signUp).not.toHaveBeenCalled()
})

test('shows the error from the backend', async () => {
  auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid login credentials') })
  render(<EmailScreen onBack={() => {}} />)

  click('I already have an account')
  fillIn('Email', 'sanne@example.com')
  fillIn('Password', 'wrong-password')
  click('Log in')

  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
})
