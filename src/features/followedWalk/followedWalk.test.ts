import { beforeEach, expect, test, vi } from 'vitest'
import {
  NotSharedError,
  fetchFollowedWalk,
  forgetOpenedWalk,
  takeOpenedWalkId,
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
  })
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
