import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { NotSharedError, type FollowedWalk } from './followedWalk.ts'
import FollowedWalkScreen from './FollowedWalkScreen.tsx'

const { fetchFollowedWalk, watchWalk } = vi.hoisted(() => ({
  fetchFollowedWalk: vi.fn(),
  watchWalk: vi.fn(),
}))

vi.mock('./followedWalk.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./followedWalk.ts')>()),
  fetchFollowedWalk,
  watchWalk,
}))
vi.mock('../map/MapView.tsx', () => ({
  default: (props: {
    lastLocation?: [number, number] | null
    routes?: { coordinates: [number, number][] }[]
  }) =>
    props.routes?.length ? (
      <p>Map with a route of {props.routes[0].coordinates.length} points</p>
    ) : (
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
  youAreWatching: false,
  route: null,
}

beforeEach(() => {
  fetchFollowedWalk.mockReset()
  watchWalk.mockReset().mockResolvedValue(undefined)
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

test('a contact can say "I’m watching" while the walk is on the way', async () => {
  fetchFollowedWalk.mockResolvedValue({ ...overdue, status: 'active', lastLocation: null })
  renderScreen()

  const button = await screen.findByRole('button', { name: 'I’m watching' })
  await act(async () => fireEvent.click(button))

  expect(watchWalk).toHaveBeenCalledWith('walk-1')
  expect(screen.getByRole('status')).toHaveTextContent('You’re watching. Anna can see that')
})

test('a contact who is already watching does not get the button again', async () => {
  fetchFollowedWalk.mockResolvedValue({
    ...overdue,
    status: 'active',
    lastLocation: null,
    youAreWatching: true,
  })
  renderScreen()

  expect(await screen.findByText(/You’re watching/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'I’m watching' })).not.toBeInTheDocument()
})

test('an overdue walk has no "I’m watching": the alert has already gone out', async () => {
  fetchFollowedWalk.mockResolvedValue(overdue)
  renderScreen()

  await screen.findByText('Check-in overdue')
  expect(screen.queryByRole('button', { name: 'I’m watching' })).not.toBeInTheDocument()
})

test('while the walk is on the way, the contact sees the planned route and that it is not live', async () => {
  fetchFollowedWalk.mockResolvedValue({
    ...overdue,
    status: 'active',
    lastLocation: null,
    // From Stratumseind towards Kruisstraat.
    route: [
      [5.4791, 51.4385],
      [5.4801, 51.439],
      [5.482, 51.4402],
    ],
  })
  renderScreen()

  expect(await screen.findByText('Map with a route of 3 points')).toBeInTheDocument()
  expect(
    screen.getByText('The route Anna planned. This is not a live position.'),
  ).toBeInTheDocument()
})

test('a walk on the way without a planned route shows no map', async () => {
  fetchFollowedWalk.mockResolvedValue({ ...overdue, status: 'active', lastLocation: null })
  renderScreen()

  await screen.findByRole('heading', { name: 'Anna is on the way home' })
  expect(screen.queryByText(/Map with/)).not.toBeInTheDocument()
})
