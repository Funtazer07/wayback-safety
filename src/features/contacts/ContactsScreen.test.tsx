import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { ContactWalk } from '../followedWalk/followedWalk.ts'
import type { Contact } from './contacts.ts'
import ContactsScreen from './ContactsScreen.tsx'

const api = vi.hoisted(() => ({
  fetchContacts: vi.fn(),
  fetchAlertStatus: vi.fn(),
  createInvite: vi.fn(),
  setContactPaused: vi.fn(),
  removeContact: vi.fn(),
}))

vi.mock('./contacts.ts', () => api)
const { fetchContactWalks } = vi.hoisted(() => ({ fetchContactWalks: vi.fn() }))
vi.mock('../followedWalk/followedWalk.ts', () => ({ fetchContactWalks }))

const mum: Contact = { id: 'c-mum', label: 'Mum', status: 'accepted', inviteExpiresAt: null }
const sam: Contact = {
  id: 'c-sam',
  label: 'Sam',
  status: 'invited',
  inviteExpiresAt: new Date(Date.now() + 24 * 60 * 60_000),
}
const link =
  'https://funtazer07.github.io/wayback-safety/?invite=0ddc2e61-c2a8-4dc4-9586-6656c2bdc63a'

// Mum's walk from Stratumseind, to be home by 22:36.
const mumsWalk: ContactWalk = {
  walkId: 'walk-mum',
  walkerName: 'Mum',
  contactId: 'c-mum',
  status: 'active',
  deadline: new Date('2026-10-26T22:36:00'),
  overdueAt: null,
  checkedInAt: null,
  cancelledAt: null,
}

beforeEach(() => {
  api.fetchContacts.mockReset().mockResolvedValue([mum, sam])
  api.fetchAlertStatus.mockReset().mockResolvedValue(new Map())
  api.createInvite.mockReset()
  api.setContactPaused.mockReset()
  api.removeContact.mockReset().mockResolvedValue(undefined)
  fetchContactWalks.mockReset().mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function renderScreen(onOpenWalk = vi.fn()) {
  render(<ContactsScreen userId="user-1" displayName="Anna" onOpenWalk={onOpenWalk} />)
}

test('each contact who accepted says whether an alert can reach them', async () => {
  api.fetchContacts.mockResolvedValue([mum, { ...mum, id: 'c-alex', label: 'Alex' }])
  api.fetchAlertStatus.mockResolvedValue(
    new Map([
      ['c-mum', true],
      ['c-alex', false],
    ]),
  )
  renderScreen()

  expect(await screen.findByRole('button', { name: /Mum.*Can receive alerts/ })).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: /Alex.*Notifications off: cannot receive alerts/ }),
  ).toBeInTheDocument()
})

test('the list still shows when the alert status cannot be loaded', async () => {
  api.fetchAlertStatus.mockRejectedValue(new Error('Network error'))
  renderScreen()

  expect(
    await screen.findByRole('button', { name: /Mum.*Invitation accepted/ }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('a contact on the way shows when they should be home, and opens their walk', async () => {
  fetchContactWalks.mockResolvedValue([mumsWalk])
  const onOpenWalk = vi.fn()
  renderScreen(onOpenWalk)

  fireEvent.click(await screen.findByRole('button', { name: 'On the way · home by 22:36' }))

  expect(onOpenWalk).toHaveBeenCalledWith('walk-mum')
})

test('the walk line updates by itself when the contact gets home', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  fetchContactWalks.mockResolvedValue([mumsWalk])
  renderScreen()
  expect(await screen.findByRole('button', { name: /On the way/ })).toBeInTheDocument()

  fetchContactWalks.mockResolvedValue([
    { ...mumsWalk, status: 'safe', checkedInAt: new Date('2026-10-26T22:31:00') },
  ])
  await act(() => vi.advanceTimersByTimeAsync(30_000))

  expect(screen.getByRole('button', { name: 'Home safe at 22:31' })).toBeInTheDocument()
})

test('a contact whose check-in is overdue gets a way into that walk', async () => {
  fetchContactWalks.mockResolvedValue([
    { ...mumsWalk, status: 'overdue', overdueAt: new Date('2026-10-26T22:42:00') },
  ])
  const onOpenWalk = vi.fn()
  renderScreen(onOpenWalk)

  fireEvent.click(await screen.findByRole('button', { name: 'Check-in overdue · View walk' }))

  expect(onOpenWalk).toHaveBeenCalledWith('walk-mum')
  // Only one line, next to Mum: not also on its own.
  expect(screen.queryByRole('list', { name: 'Other overdue walks' })).not.toBeInTheDocument()
})

test('an overdue walk of someone no longer on the list still shows, with their name', async () => {
  fetchContactWalks.mockResolvedValue([
    { ...mumsWalk, walkId: 'walk-kim', walkerName: 'Kim', contactId: null, status: 'overdue' },
    // A walk on the way of someone not on the list is not worth a line of its own.
    { ...mumsWalk, walkId: 'walk-ben', walkerName: 'Ben', contactId: null },
  ])
  const onOpenWalk = vi.fn()
  renderScreen(onOpenWalk)

  const list = await screen.findByRole('list', { name: 'Other overdue walks' })
  expect(within(list).getByText('Kim')).toBeInTheDocument()
  expect(within(list).queryByText('Ben')).not.toBeInTheDocument()
  fireEvent.click(within(list).getByRole('button', { name: 'Check-in overdue · View walk' }))
  expect(onOpenWalk).toHaveBeenCalledWith('walk-kim')
})

test('without walks there is no walk line', async () => {
  renderScreen()

  await screen.findByRole('list', { name: 'Your trusted contacts' })
  await vi.waitFor(() => expect(fetchContactWalks).toHaveBeenCalled())
  expect(screen.queryByText(/Check-in overdue|On the way|Home safe/)).not.toBeInTheDocument()
})

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

test('a push message updates the walk line at once, without waiting or switching screens', async () => {
  const serviceWorker = new EventTarget()
  vi.stubGlobal('navigator', { ...navigator, serviceWorker })
  fetchContactWalks.mockResolvedValue([mumsWalk])
  renderScreen()
  expect(await screen.findByRole('button', { name: /On the way/ })).toBeInTheDocument()

  fetchContactWalks.mockResolvedValue([
    { ...mumsWalk, status: 'overdue', overdueAt: new Date('2026-10-26T22:42:00') },
  ])
  await act(async () => {
    serviceWorker.dispatchEvent(
      Object.assign(new Event('message'), { data: { type: 'wayback-push' } }),
    )
  })

  expect(
    await screen.findByRole('button', { name: 'Check-in overdue · View walk' }),
  ).toBeInTheDocument()
})
