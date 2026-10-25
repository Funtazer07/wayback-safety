import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { Contact } from './contacts.ts'
import ContactsScreen from './ContactsScreen.tsx'

const api = vi.hoisted(() => ({
  fetchContacts: vi.fn(),
  createInvite: vi.fn(),
  setContactPaused: vi.fn(),
  removeContact: vi.fn(),
}))

vi.mock('./contacts.ts', () => api)

const mum: Contact = { id: 'c-mum', label: 'Mum', status: 'accepted', inviteExpiresAt: null }
const sam: Contact = {
  id: 'c-sam',
  label: 'Sam',
  status: 'invited',
  inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60_000),
}
const link =
  'https://funtazer07.github.io/wayback-safety/?invite=0ddc2e61-c2a8-4dc4-9586-6656c2bdc63a'

beforeEach(() => {
  api.fetchContacts.mockReset().mockResolvedValue([mum, sam])
  api.createInvite.mockReset()
  api.setContactPaused.mockReset()
  api.removeContact.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderScreen() {
  render(<ContactsScreen userId="user-1" displayName="Anna" />)
}

test('the user sees their contacts and where each invitation stands', async () => {
  renderScreen()

  const list = await screen.findByRole('list', { name: 'Your trusted contacts' })
  expect(within(list).getByRole('button', { name: /Mum.*Invitation accepted/ })).toBeInTheDocument()
  expect(within(list).getByRole('button', { name: /Sam.*Invitation pending/ })).toBeInTheDocument()
})

test('someone without contacts is told what inviting is for', async () => {
  api.fetchContacts.mockResolvedValue([])
  renderScreen()

  expect(await screen.findByText(/No contacts yet/)).toBeInTheDocument()
})

test('tapping a contact shows their options, and Pause updates pauses them', async () => {
  api.setContactPaused.mockResolvedValue({ ...mum, status: 'paused' })
  renderScreen()

  fireEvent.click(await screen.findByRole('button', { name: /Mum/ }))
  const options = screen.getByRole('region', { name: 'Mum, contact options' })
  await act(async () =>
    fireEvent.click(within(options).getByRole('button', { name: 'Pause updates' })),
  )

  expect(api.setContactPaused).toHaveBeenCalledWith('c-mum', true)
  expect(screen.getByRole('button', { name: /Mum.*Updates paused/ })).toBeInTheDocument()
})

test('removing a contact asks first, then takes them off the list', async () => {
  renderScreen()

  fireEvent.click(await screen.findByRole('button', { name: /Mum/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove contact' }))
  expect(screen.getByText(/They will no longer hear about your walks/)).toBeInTheDocument()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Yes, remove' })))

  expect(api.removeContact).toHaveBeenCalledWith('c-mum')
  expect(screen.queryByRole('button', { name: /Mum/ })).not.toBeInTheDocument()
})

test('an open invite can be cancelled but not paused', async () => {
  renderScreen()

  fireEvent.click(await screen.findByRole('button', { name: /Sam/ }))

  expect(screen.queryByRole('button', { name: 'Pause updates' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cancel invite' })).toBeInTheDocument()
})

test('inviting names the contact and opens the phone’s share menu with the link', async () => {
  const share = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { share })
  api.createInvite.mockResolvedValue({ contactId: 'c-alex', link, expiresAt: new Date() })
  renderScreen()

  fireEvent.click(await screen.findByRole('button', { name: 'Invite by link or email' }))
  fireEvent.change(screen.getByLabelText('What do you call them?'), { target: { value: 'Alex' } })
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Make an invite link' })),
  )

  expect(api.createInvite).toHaveBeenCalledWith('Alex')
  expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: link }))
  expect(screen.getByRole('status')).toHaveTextContent('Sent.')
})

test('without a share menu the link is shown with a Copy button', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  api.createInvite.mockResolvedValue({ contactId: 'c-alex', link, expiresAt: new Date() })
  renderScreen()

  fireEvent.click(await screen.findByRole('button', { name: 'Invite by link or email' }))
  fireEvent.change(screen.getByLabelText('What do you call them?'), { target: { value: 'Alex' } })
  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Make an invite link' })),
  )
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy link' })))

  expect(screen.getByText(link)).toBeInTheDocument()
  expect(writeText).toHaveBeenCalledWith(link)
  expect(screen.getByRole('status')).toHaveTextContent('Link copied.')
})
