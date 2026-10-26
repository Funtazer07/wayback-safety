import { beforeEach, expect, test, vi } from 'vitest'
import {
  cancelWalk,
  checkInWalk,
  extendWalk,
  fetchCurrentWalk,
  fetchWalkContactNames,
  fetchWalkContacts,
  fetchWalkWatchers,
  startWalk,
  updateWalkLocation,
} from './walk.ts'

const { rpc, maybeSingle, inStatus, eq } = vi.hoisted(() => ({
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
  inStatus: vi.fn(),
  eq: vi.fn(),
}))

// fetchCurrentWalk asks walks with .in().order().limit().maybeSingle(); fetchWalkContactNames asks
// walk_contacts with .eq().
vi.mock('../../lib/supabase.ts', () => ({
  supabase: {
    rpc,
    from: () => ({
      select: () => ({
        in: (...args: unknown[]) => {
          inStatus(...args)
          return { order: () => ({ limit: () => ({ maybeSingle }) }) }
        },
        eq,
      }),
    }),
  },
}))

const row = {
  id: 'walk-1',
  destination_label: 'Home',
  started_at: '2026-10-06T22:00:00+00:00',
  deadline: '2026-10-06T22:25:00+00:00',
  status: 'active',
  warned_at: null,
  checked_in_at: null,
}

beforeEach(() => {
  rpc.mockReset()
  maybeSingle.mockReset()
  inStatus.mockReset()
  eq.mockReset()
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
    warnedAt: null,
    checkedInAt: null,
  })
})

test('starting a walk sends the contacts who follow it', async () => {
  rpc.mockResolvedValue({ data: row, error: null })

  await startWalk({ destinationLabel: 'Home', minutes: 25, contactIds: ['contact-1', 'contact-2'] })

  expect(rpc).toHaveBeenCalledWith(
    'start_walk',
    expect.objectContaining({ contact_ids: ['contact-1', 'contact-2'] }),
  )
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

test('checking in ends the given walk and returns it as safe', async () => {
  rpc.mockResolvedValue({
    data: { ...row, status: 'safe', checked_in_at: '2026-10-06T22:26:00+00:00' },
    error: null,
  })

  const walk = await checkInWalk('walk-1')

  expect(rpc).toHaveBeenCalledWith('check_in', { walk_id: 'walk-1' })
  expect(walk.status).toBe('safe')
  expect(walk.checkedInAt).toEqual(new Date('2026-10-06T22:26:00Z'))
})

test('checking in fails when the server refuses it', async () => {
  const error = new Error('No walk in progress with this id')
  rpc.mockResolvedValue({ data: null, error })

  await expect(checkInWalk('walk-1')).rejects.toBe(error)
})

test('extending a walk sends the minutes and returns the new deadline the server set', async () => {
  rpc.mockResolvedValue({ data: { ...row, deadline: '2026-10-06T22:35:00+00:00' }, error: null })

  const walk = await extendWalk('walk-1', 10)

  expect(rpc).toHaveBeenCalledWith('extend_walk', { walk_id: 'walk-1', minutes: 10 })
  expect(walk.deadline).toEqual(new Date('2026-10-06T22:35:00Z'))
})

test('extending a walk fails when the server refuses it', async () => {
  const error = new Error('The deadline cannot be more than 3 hours from now')
  rpc.mockResolvedValue({ data: null, error })

  await expect(extendWalk('walk-1', 15)).rejects.toBe(error)
})

test('cancelling ends the given walk and returns it as cancelled', async () => {
  rpc.mockResolvedValue({ data: { ...row, status: 'cancelled' }, error: null })

  const walk = await cancelWalk('walk-1')

  expect(rpc).toHaveBeenCalledWith('cancel_walk', { walk_id: 'walk-1' })
  expect(walk.status).toBe('cancelled')
})

test('cancelling fails when the server refuses it', async () => {
  const error = new Error('No walk in progress with this id')
  rpc.mockResolvedValue({ data: null, error })

  await expect(cancelWalk('walk-1')).rejects.toBe(error)
})

test('the active walk is returned when there is one', async () => {
  maybeSingle.mockResolvedValue({ data: row, error: null })

  const walk = await fetchCurrentWalk()

  expect(walk?.deadline).toEqual(new Date('2026-10-06T22:25:00Z'))
})

test('an overdue walk still counts, so the user can still check in', async () => {
  maybeSingle.mockResolvedValue({
    data: { ...row, status: 'overdue', warned_at: '2026-10-06T22:26:00+00:00' },
    error: null,
  })

  const walk = await fetchCurrentWalk()

  expect(inStatus).toHaveBeenCalledWith('status', ['active', 'overdue'])
  expect(walk?.status).toBe('overdue')
  expect(walk?.warnedAt).toEqual(new Date('2026-10-06T22:26:00Z'))
})

test('there is no current walk when the user is not on one', async () => {
  maybeSingle.mockResolvedValue({ data: null, error: null })

  expect(await fetchCurrentWalk()).toBeNull()
})

test('the names of the contacts who follow a walk are returned', async () => {
  eq.mockResolvedValue({
    data: [{ contacts: { label: 'Mum' } }, { contacts: { label: 'Alex' } }, { contacts: null }],
    error: null,
  })

  expect(await fetchWalkContactNames('walk-1')).toEqual(['Mum', 'Alex'])
  expect(eq).toHaveBeenCalledWith('walk_id', 'walk-1')
})

test('the contacts of a walk come with their status, without removed ones', async () => {
  eq.mockResolvedValue({
    data: [
      { contacts: { id: 'c-mum', label: 'Mum', status: 'accepted' } },
      { contacts: { id: 'c-pat', label: 'Pat', status: 'paused' } },
      { contacts: null },
    ],
    error: null,
  })

  expect(await fetchWalkContacts('walk-1')).toEqual([
    { id: 'c-mum', label: 'Mum', status: 'accepted' },
    { id: 'c-pat', label: 'Pat', status: 'paused' },
  ])
  expect(eq).toHaveBeenCalledWith('walk_id', 'walk-1')
})

test('the names of the contacts who are watching come first-tapped first', async () => {
  eq.mockResolvedValue({
    data: [
      { watching_at: '2026-10-26T22:09:00Z', contacts: { label: 'Alex' } },
      { watching_at: null, contacts: { label: 'Sam' } },
      { watching_at: '2026-10-26T22:07:00Z', contacts: { label: 'Mum' } },
      { watching_at: '2026-10-26T22:08:00Z', contacts: null },
    ],
    error: null,
  })

  expect(await fetchWalkWatchers('walk-1')).toEqual(['Mum', 'Alex'])
  expect(eq).toHaveBeenCalledWith('walk_id', 'walk-1')
})
