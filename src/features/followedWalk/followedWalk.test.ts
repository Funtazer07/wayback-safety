import { beforeEach, expect, test, vi } from 'vitest'
import {
  NotSharedError,
  fetchFollowedWalk,
  fetchContactWalks,
  forgetOpenedWalk,
  takeOpenedWalkId,
  watchWalk,
} from './followedWalk.ts'

const { rpc, single } = vi.hoisted(() => ({ rpc: vi.fn(), single: vi.fn() }))

vi.mock('../../lib/supabase.ts', () => ({ supabase: { rpc } }))

const walkId = '554f1173-05c1-496b-8481-77df511e55de'

// Anna's walk, overdue, last seen near Stratumseind at 22:31.
const row = {
  walker_name: 'Anna',
  status: 'overdue',
  deadline: '2026-10-15T20:36:00Z',
  overdue_at: '2026-10-15T20:42:00Z',
  checked_in_at: null,
  cancelled_at: null,
  last_lat: 51.4385,
  last_lng: 5.4791,
  last_location_at: '2026-10-15T20:31:00Z',
  you_are_watching: false,
  route: null,
}

beforeEach(() => {
  rpc.mockReset().mockReturnValue({ single })
  single.mockReset()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

test('a contact gets the walk with the last location and when it was saved', async () => {
  single.mockResolvedValue({ data: row, error: null })

  const walk = await fetchFollowedWalk(walkId)

  expect(rpc).toHaveBeenCalledWith('followed_walk', { walk_id: walkId })
  expect(walk).toEqual({
    walkerName: 'Anna',
    status: 'overdue',
    deadline: new Date('2026-10-15T20:36:00Z'),
    overdueAt: new Date('2026-10-15T20:42:00Z'),
    checkedInAt: null,
    cancelledAt: null,
    lastLocation: { coordinates: [5.4791, 51.4385], savedAt: new Date('2026-10-15T20:31:00Z') },
    youAreWatching: false,
    route: null,
  })
})

test('a walk on the way comes with the route the walker planned', async () => {
  const route = [
    [5.4791, 51.4385],
    [5.482, 51.4402],
  ]
  single.mockResolvedValue({ data: { ...row, status: 'active', route }, error: null })

  expect((await fetchFollowedWalk(walkId)).route).toEqual(route)
})

test('a walk without a shared location has none', async () => {
  single.mockResolvedValue({
    data: { ...row, last_lat: null, last_lng: null, last_location_at: null },
    error: null,
  })

  expect((await fetchFollowedWalk(walkId)).lastLocation).toBeNull()
})

test('a walk that is not shared with this user is reported as such', async () => {
  single.mockResolvedValue({
    data: null,
    error: new Error('This walk is not shared with you'),
  })

  await expect(fetchFollowedWalk(walkId)).rejects.toBeInstanceOf(NotSharedError)
})

test('other failures are passed on as they are', async () => {
  const error = new Error('Network error')
  single.mockResolvedValue({ data: null, error })

  await expect(fetchFollowedWalk(walkId)).rejects.toBe(error)
})

test('the latest walk of each contact comes with its status and the row to show it next to', async () => {
  rpc.mockResolvedValue({
    data: [
      {
        walk_id: walkId,
        walker_name: 'Anna',
        contact_id: 'c-anna',
        status: 'safe',
        started_at: '2026-10-15T20:16:00Z',
        deadline: '2026-10-15T20:36:00Z',
        overdue_at: null,
        checked_in_at: '2026-10-15T20:31:00Z',
        cancelled_at: null,
      },
      {
        walk_id: 'walk-2',
        walker_name: null,
        contact_id: null,
        status: 'overdue',
        started_at: '2026-10-15T20:30:00Z',
        deadline: '2026-10-15T20:50:00Z',
        overdue_at: '2026-10-15T21:00:00Z',
        checked_in_at: null,
        cancelled_at: null,
      },
    ],
    error: null,
  })

  expect(await fetchContactWalks()).toEqual([
    {
      walkId,
      walkerName: 'Anna',
      contactId: 'c-anna',
      status: 'safe',
      startedAt: new Date('2026-10-15T20:16:00Z'),
      deadline: new Date('2026-10-15T20:36:00Z'),
      overdueAt: null,
      checkedInAt: new Date('2026-10-15T20:31:00Z'),
      cancelledAt: null,
    },
    {
      walkId: 'walk-2',
      walkerName: 'Your contact',
      contactId: null,
      status: 'overdue',
      startedAt: new Date('2026-10-15T20:30:00Z'),
      deadline: new Date('2026-10-15T20:50:00Z'),
      overdueAt: new Date('2026-10-15T21:00:00Z'),
      checkedInAt: null,
      cancelledAt: null,
    },
  ])
  expect(rpc).toHaveBeenCalledWith('followed_walk_statuses')
})

test('loading the walks of contacts fails when the server refuses', async () => {
  const error = new Error('Network error')
  rpc.mockResolvedValue({ data: null, error })

  await expect(fetchContactWalks()).rejects.toBe(error)
})

test('the walk from the alert link is read and removed from the address bar', () => {
  window.history.replaceState(null, '', `/?walk=${walkId}`)

  expect(takeOpenedWalkId()).toBe(walkId)
  expect(window.location.search).toBe('')
})

test('the walk is remembered through signing in, until the contact closes it', () => {
  window.history.replaceState(null, '', `/?walk=${walkId}`)
  takeOpenedWalkId()

  // Back from Google's sign-in page, without ?walk= in the address.
  expect(takeOpenedWalkId()).toBe(walkId)

  forgetOpenedWalk()
  expect(takeOpenedWalkId()).toBeNull()
})

test('anything that is not a walk id is ignored', () => {
  window.history.replaceState(null, '', '/?walk=not-a-walk')

  expect(takeOpenedWalkId()).toBeNull()
})

test('"I’m watching" is sent for this walk', async () => {
  rpc.mockResolvedValue({ error: null })

  await watchWalk(walkId)

  expect(rpc).toHaveBeenCalledWith('watch_walk', { walk_id: walkId })
})

test('"I’m watching" fails when the server refuses, for example after the walk ended', async () => {
  const error = new Error('This walk is not shared with you, or it is no longer on the way')
  rpc.mockResolvedValue({ error })

  await expect(watchWalk(walkId)).rejects.toBe(error)
})
