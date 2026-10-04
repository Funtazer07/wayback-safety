import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import AuthScreen from './AuthScreen.tsx'

const auth = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
}))

// A stand-in for the real backend, so the tests never talk to Supabase.
vi.mock('../../lib/supabase.ts', () => ({ supabase: { auth } }))

beforeEach(() => {
  vi.clearAllMocks()
  auth.signInWithOtp.mockResolvedValue({ error: null })
  auth.signUp.mockResolvedValue({ data: { session: {} }, error: null })
  auth.signInWithPassword.mockResolvedValue({ error: null })
})

function fillIn(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function confirmAge() {
  fireEvent.click(screen.getByLabelText('I am 16 or older'))
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
}

test('sign-up sends a login email and records the age confirmation', async () => {
  render(<AuthScreen />)

  fillIn('Email', 'sanne@example.com')
  confirmAge()
  click('Send me a link')

  expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
  expect(auth.signInWithOtp).toHaveBeenCalledWith({
    email: 'sanne@example.com',
    options: expect.objectContaining({ shouldCreateUser: true, data: { age_confirmed: true } }),
  })
})

test('sign-up with a password creates an account', async () => {
  render(<AuthScreen />)

  click('Use a password')
  fillIn('Email', 'sanne@example.com')
  fillIn('Password', 'long-enough-password')
  confirmAge()
  click('Create account')

  await vi.waitFor(() =>
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'sanne@example.com', password: 'long-enough-password' }),
    ),
  )
})

test('sign-up is blocked until the age is confirmed', () => {
  render(<AuthScreen />)

  fillIn('Email', 'sanne@example.com')
  click('Send me a link')

  expect(auth.signInWithOtp).not.toHaveBeenCalled()
})

test('logging in does not ask for the age again and does not create accounts', async () => {
  render(<AuthScreen />)

  click('I have an account')
  expect(screen.queryByLabelText('I am 16 or older')).not.toBeInTheDocument()

  fillIn('Email', 'sanne@example.com')
  click('Send me a link')

  await vi.waitFor(() =>
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'sanne@example.com',
      options: expect.objectContaining({ shouldCreateUser: false, data: undefined }),
    }),
  )
})

test('shows the error from the backend', async () => {
  auth.signInWithPassword.mockResolvedValue({ error: new Error('Invalid login credentials') })
  render(<AuthScreen />)

  click('I have an account')
  click('Use a password')
  fillIn('Email', 'sanne@example.com')
  fillIn('Password', 'wrong-password')
  click('Log in')

  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
})
