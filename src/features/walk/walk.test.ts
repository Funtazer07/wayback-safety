import { beforeEach, expect, test, vi } from 'vitest'
import { fetchActiveWalk, startWalk, updateWalkLocation } from './walk.ts'

const { rpc, maybeSingle } = vi.hoisted(() => ({ rpc: vi.fn(), maybeSingle: vi.fn() }))

vi.mock('../../lib/supabase.ts', () => ({
  supabase: {
    rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  },
}))

const row = {
  id: 'walk-1',
  destination_label: 'Home',
  started_at: '2026-10-06T22:00:00+00:00',
  deadline: '2026-10-06T22:25:00+00:00',
  status: 'active',
}

beforeEach(() => {
  rpc.mockReset()
  maybeSingle.mockReset()
})

test('starting a walk sends the duration and returns the deadline the server set', async () => {
  rpc.mockResolvedValue({ data: row, error: null })

  const walk = await startWalk({
    destinationLabel: 'Home',
    latitude: 51.4416,
    longitude: 5.4697,
    minutes: 25,
  })

  expect(rpc).toHaveBeenCalledWith('start_walk', {
    label: 'Home',
    minutes: 25,
    lat: 51.4416,
    lng: 5.4697,
  })
  expect(walk).toEqual({
    id: 'walk-1',
    destinationLabel: 'Home',
    startedAt: new Date('2026-10-06T22:00:00Z'),
    deadline: new Date('2026-10-06T22:25:00Z'),
    status: 'active',
  })
})

test('starting a walk fails when the server refuses it', async () => {
  const error = new Error('You already have an active walk')
  rpc.mockResolvedValue({ data: null, error })

  await expect(
    startWalk({ destinationLabel: 'Home', latitude: 51.4416, longitude: 5.4697, minutes: 25 }),
  ).rejects.toBe(error)
})

test('a location update is sent for the given walk and returns its current status', async () => {
  rpc.mockResolvedValue({ data: { ...row, status: 'overdue' }, error: null })

  const walk = await updateWalkLocation('walk-1', 51.4381, 5.4752)

  expect(rpc).toHaveBeenCalledWith('update_walk_location', {
    walk_id: 'walk-1',
    lat: 51.4381,
    lng: 5.4752,
  })
  expect(walk.status).toBe('overdue')
})

test('the active walk is returned when there is one', async () => {
  maybeSingle.mockResolvedValue({ data: row, error: null })

  const walk = await fetchActiveWalk()

  expect(walk?.deadline).toEqual(new Date('2026-10-06T22:25:00Z'))
})

test('there is no active walk when the user is not on one', async () => {
  maybeSingle.mockResolvedValue({ data: null, error: null })

  expect(await fetchActiveWalk()).toBeNull()
})
