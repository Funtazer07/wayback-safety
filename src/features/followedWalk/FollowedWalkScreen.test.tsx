import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { NotSharedError, type FollowedWalk } from './followedWalk.ts'
import FollowedWalkScreen from './FollowedWalkScreen.tsx'

const { fetchFollowedWalk } = vi.hoisted(() => ({ fetchFollowedWalk: vi.fn() }))

vi.mock('./followedWalk.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./followedWalk.ts')>()),
  fetchFollowedWalk,
}))
// The map needs a real browser; it has its own tests in features/map.
vi.mock('../map/MapView.tsx', () => ({
  default: (props: { lastLocation?: [number, number] | null }) => (
    <p>Map with a pin at {props.lastLocation?.join(', ')}</p>
  ),
}))

// Anna's walk, overdue: due at 22:36, last seen near Stratumseind at 22:31.
const overdue: FollowedWalk = {
  walkerName: 'Anna',
  status: 'overdue',
  deadline: new Date('2026-10-15T22:36:00'),
  overdueAt: new Date('2026-10-15T22:42:00'),
  checkedInAt: null,
  cancelledAt: null,
  lastLocation: { coordinates: [5.4791, 51.4385], savedAt: new Date('2026-10-15T22:31:00') },
}

beforeEach(() => {
  fetchFollowedWalk.mockReset()
})

function renderScreen() {
  const onClose = vi.fn()
  render(<FollowedWalkScreen walkId="walk-1" onClose={onClose} />)
  return { onClose }
}

test('the contact sees whose walk is overdue, when it was due, and the last location', async () => {
  fetchFollowedWalk.mockResolvedValue(overdue)
  renderScreen()

  expect(await screen.findByRole('heading', { name: 'Anna’s walk' })).toBeInTheDocument()
  expect(screen.getByText('Check-in overdue')).toBeInTheDocument()
  expect(screen.getByText('Due at 22:36. No confirmation yet.')).toBeInTheDocument()
  expect(screen.getByText('Map with a pin at 5.4791, 51.4385')).toBeInTheDocument()
  expect(screen.getByText('Last location at 22:31')).toBeInTheDocument()
  expect(
    screen.getByText('This is the last shared location, not a live position.'),
  ).toBeInTheDocument()
})

test('without a shared location there is no map, and the screen says why', async () => {
  fetchFollowedWalk.mockResolvedValue({ ...overdue, lastLocation: null })
  renderScreen()

  expect(await screen.findByText('No location was shared during this walk.')).toBeInTheDocument()
  expect(screen.queryByText(/Map with a pin/)).not.toBeInTheDocument()
})

test('after the check-in the contact sees that the walker is safe, and no location', async () => {
  fetchFollowedWalk.mockResolvedValue({
    ...overdue,
    status: 'safe',
    checkedInAt: new Date('2026-10-15T22:44:00'),
    lastLocation: null,
  })
  renderScreen()

  expect(await screen.findByRole('heading', { name: 'Anna is safe' })).toBeInTheDocument()
  expect(screen.getByText(/Anna checked in at 22:44/)).toBeInTheDocument()
  expect(screen.queryByText(/Map with a pin/)).not.toBeInTheDocument()
})

test('a walk that is not shared with this user says so', async () => {
  fetchFollowedWalk.mockRejectedValue(new NotSharedError())
  renderScreen()

  expect(await screen.findByRole('alert')).toHaveTextContent('This walk is not shared with you')
})

test('a failed load asks to check the connection', async () => {
  fetchFollowedWalk.mockRejectedValue(new Error('Network error'))
  renderScreen()

  expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection')
})

test('Back closes the screen', async () => {
  fetchFollowedWalk.mockResolvedValue(overdue)
  const { onClose } = renderScreen()

  fireEvent.click(await screen.findByRole('button', { name: 'Back' }))

  expect(onClose).toHaveBeenCalledOnce()
})

test('a walk on the way updates by itself when the walker gets home', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  fetchFollowedWalk.mockResolvedValue({ ...overdue, status: 'active', lastLocation: null })
  renderScreen()
  expect(
    await screen.findByRole('heading', { name: 'Anna is on the way home' }),
  ).toBeInTheDocument()
  expect(
    screen.getByText(/The location is only shared if Anna misses the check-in/),
  ).toBeInTheDocument()

  fetchFollowedWalk.mockResolvedValue({
    ...overdue,
    status: 'safe',
    checkedInAt: new Date('2026-10-15T22:30:00'),
    lastLocation: null,
  })
  await vi.advanceTimersByTimeAsync(30_000)

  expect(await screen.findByRole('heading', { name: 'Anna is safe' })).toBeInTheDocument()
  vi.useRealTimers()
})
