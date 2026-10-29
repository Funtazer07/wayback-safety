import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { ContactWalk } from '../followedWalk/followedWalk.ts'
import ActivityScreen from './ActivityScreen.tsx'

const { fetchContactWalks } = vi.hoisted(() => ({ fetchContactWalks: vi.fn() }))
vi.mock('../followedWalk/followedWalk.ts', () => ({ fetchContactWalks }))
vi.mock('../notifications/NotificationCard.tsx', () => ({ default: () => null }))

// Mum's walk: started at 22:06, check-in due at 22:26.
const mumsWalk: ContactWalk = {
  walkId: 'walk-mum',
  walkerName: 'Mum',
  contactId: 'c-mum',
  status: 'active',
  startedAt: new Date('2026-10-26T22:06:00'),
  deadline: new Date('2026-10-26T22:26:00'),
  overdueAt: null,
  checkedInAt: null,
  cancelledAt: null,
}

beforeEach(() => {
  fetchContactWalks.mockReset().mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function renderScreen() {
  const onOpenWalk = vi.fn()
  const onOpenCircle = vi.fn()
  render(<ActivityScreen displayName="Anna" onOpenWalk={onOpenWalk} onOpenCircle={onOpenCircle} />)
  return { onOpenWalk, onOpenCircle }
}

test('the screen says whose account it is and what the feed is for', async () => {
  renderScreen()

  expect(screen.getByText('Anna’s account')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Activity' })).toBeInTheDocument()
  expect(await screen.findByText(/No updates yet/)).toBeInTheDocument()
})

test('a walk on the way is shown, and tapping it opens the walk', async () => {
  fetchContactWalks.mockResolvedValue([mumsWalk])
  const { onOpenWalk } = renderScreen()

  const updates = await screen.findByRole('list', { name: 'Updates' })
  fireEvent.click(within(updates).getByRole('button', { name: /Mum started a walk/ }))

  expect(onOpenWalk).toHaveBeenCalledWith('walk-mum')
})

test('a missed check-in offers "View walk"', async () => {
  fetchContactWalks.mockResolvedValue([
    { ...mumsWalk, status: 'overdue', overdueAt: new Date('2026-10-26T22:31:00') },
  ])
  renderScreen()

  const card = await screen.findByRole('button', { name: /Mum hasn’t checked in/ })
  expect(card).toHaveTextContent('View walk')
})

test('the feed updates by itself when a walk changes', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  fetchContactWalks.mockResolvedValue([mumsWalk])
  renderScreen()
  expect(await screen.findByRole('button', { name: /Mum started a walk/ })).toBeInTheDocument()

  fetchContactWalks.mockResolvedValue([
    { ...mumsWalk, status: 'safe', checkedInAt: new Date('2026-10-26T22:24:00') },
  ])
  await act(() => vi.advanceTimersByTimeAsync(30_000))

  expect(screen.getByRole('button', { name: /Mum arrived safely/ })).toBeInTheDocument()
})

test('a push message updates the feed at once, without switching screens', async () => {
  const serviceWorker = new EventTarget()
  vi.stubGlobal('navigator', { ...navigator, serviceWorker })
  fetchContactWalks.mockResolvedValue([mumsWalk])
  renderScreen()
  expect(await screen.findByRole('button', { name: /Mum started a walk/ })).toBeInTheDocument()

  fetchContactWalks.mockResolvedValue([
    { ...mumsWalk, status: 'overdue', overdueAt: new Date('2026-10-26T22:31:00') },
  ])
  await act(async () => {
    serviceWorker.dispatchEvent(
      Object.assign(new Event('message'), { data: { type: 'wayback-push' } }),
    )
  })

  expect(await screen.findByRole('button', { name: /Mum hasn’t checked in/ })).toBeInTheDocument()
})

test('Trusted contacts is one tap away', () => {
  const { onOpenCircle } = renderScreen()

  fireEvent.click(screen.getByRole('button', { name: /Trusted contacts/ }))

  expect(onOpenCircle).toHaveBeenCalledOnce()
})
