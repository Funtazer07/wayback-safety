import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import AcceptInviteScreen from './AcceptInviteScreen.tsx'

const api = vi.hoisted(() => ({
  fetchInvite: vi.fn(),
  acceptInvite: vi.fn(),
  declineInvite: vi.fn(),
}))

vi.mock('./contacts.ts', () => api)
// The notification card has its own tests in features/notifications.
vi.mock('../notifications/NotificationCard.tsx', () => ({
  default: ({ reason }: { reason: string }) => <p>Notification card: {reason}</p>,
}))

const token = '0ddc2e61-c2a8-4dc4-9586-6656c2bdc63a'

beforeEach(() => {
  api.fetchInvite.mockReset().mockResolvedValue({ inviterName: 'Anna', expiresAt: new Date() })
  api.acceptInvite.mockReset().mockResolvedValue(undefined)
  api.declineInvite.mockReset().mockResolvedValue(undefined)
})

test('the contact sees who invited them and what accepting means', async () => {
  render(<AcceptInviteScreen token={token} onClose={vi.fn()} />)

  expect(await screen.findByRole('heading', { name: 'Anna invited you' })).toBeInTheDocument()
  expect(screen.getByText(/Nothing is shared with you before you accept/)).toBeInTheDocument()
})

test('accepting makes them a contact and then offers notifications', async () => {
  render(<AcceptInviteScreen token={token} onClose={vi.fn()} />)

  const button = await screen.findByRole('button', { name: 'Accept' })
  await act(async () => fireEvent.click(button))

  expect(api.acceptInvite).toHaveBeenCalledWith(token)
  expect(screen.getByRole('heading', { name: 'You now look out for Anna' })).toBeInTheDocument()
  expect(
    screen.getByText(/Notification card: WayBack can then tell you when Anna/),
  ).toBeInTheDocument()
})

test('declining answers the invite and closes the screen', async () => {
  const onClose = vi.fn()
  render(<AcceptInviteScreen token={token} onClose={onClose} />)

  const button = await screen.findByRole('button', { name: 'Decline' })
  await act(async () => fireEvent.click(button))

  expect(api.declineInvite).toHaveBeenCalledWith(token)
  expect(onClose).toHaveBeenCalledOnce()
})

test('an old or used link says so instead of offering Accept', async () => {
  api.fetchInvite.mockRejectedValue(new Error('This invite link is not valid any more'))
  render(<AcceptInviteScreen token={token} onClose={vi.fn()} />)

  expect(
    await screen.findByRole('heading', { name: 'This invite does not work' }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
})

test('opening your own invite link gives the server’s reason', async () => {
  api.acceptInvite.mockRejectedValue(new Error('You cannot accept your own invite'))
  render(<AcceptInviteScreen token={token} onClose={vi.fn()} />)

  const button = await screen.findByRole('button', { name: 'Accept' })
  await act(async () => fireEvent.click(button))

  expect(screen.getByRole('alert')).toHaveTextContent('You cannot accept your own invite.')
})
