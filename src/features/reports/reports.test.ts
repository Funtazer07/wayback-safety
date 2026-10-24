import { beforeEach, expect, test, vi } from 'vitest'
import { reportPlace, roundForReport } from './reports.ts'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('../../lib/supabase.ts', () => ({ supabase: { rpc } }))

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ error: null })
})

test('a spot is rounded to 3 decimals, about 100 m', () => {
  // Stratumseind 32, as a phone would give it.
  expect(roundForReport(51.438527)).toBe(51.439)
  expect(roundForReport(5.479134)).toBe(5.479)
})

test('a place report sends only the rounded spot, never the exact one', async () => {
  await reportPlace({ category: 'quiet', latitude: 51.438527, longitude: 5.479134 })

  expect(rpc).toHaveBeenCalledWith('report_place', {
    category: 'quiet',
    lat: 51.439,
    lng: 5.479,
    note: null,
  })
})

test('a note is sent without spaces around it, and an empty note is left out', async () => {
  await reportPlace({
    category: 'other',
    latitude: 51.44,
    longitude: 5.47,
    note: '  Dark tunnel  ',
  })
  expect(rpc).toHaveBeenLastCalledWith(
    'report_place',
    expect.objectContaining({ note: 'Dark tunnel' }),
  )

  await reportPlace({ category: 'other', latitude: 51.44, longitude: 5.47, note: '   ' })
  expect(rpc).toHaveBeenLastCalledWith('report_place', expect.objectContaining({ note: null }))
})

test('a place report fails when the server refuses it', async () => {
  const error = new Error('You can make at most 20 reports a day')
  rpc.mockResolvedValue({ error })

  await expect(reportPlace({ category: 'unsafe', latitude: 51.44, longitude: 5.47 })).rejects.toBe(
    error,
  )
})
