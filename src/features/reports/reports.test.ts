import { beforeEach, expect, test, vi } from 'vitest'
import { fetchPlaceReports, reportPlace, roundForReport } from './reports.ts'

const { rpc, from, select, is } = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  is: vi.fn(),
}))

vi.mock('../../lib/supabase.ts', () => ({ supabase: { rpc, from } }))

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ error: null })
  from.mockReset().mockReturnValue({ select })
  select.mockReset().mockReturnValue({ is })
  is.mockReset().mockResolvedValue({ data: [], error: null })
})

test('the map gets place reports without who made them or their note', async () => {
  is.mockResolvedValue({
    data: [
      {
        id: 'r-1',
        category: 'dark_area',
        lat: 51.439,
        lng: 5.479,
        created_at: '2026-11-04T21:30:00Z',
      },
    ],
    error: null,
  })

  const reports = await fetchPlaceReports()

  expect(select).toHaveBeenCalledWith('id, category, lat, lng, created_at')
  // Broken lights from the map have a lamp and are fetched separately.
  expect(is).toHaveBeenCalledWith('lamp_id', null)
  expect(reports).toEqual([
    {
      id: 'r-1',
      category: 'dark_area',
      coordinates: [5.479, 51.439],
      reportedAt: new Date('2026-11-04T21:30:00Z'),
    },
  ])
})

test('loading the place reports fails when the server refuses it', async () => {
  const error = new Error('network')
  is.mockResolvedValue({ data: null, error })

  await expect(fetchPlaceReports()).rejects.toBe(error)
})

test('a spot is rounded to 3 decimals, about 100 m', () => {
  // Stratumseind 32, as a phone would give it.
  expect(roundForReport(51.438527)).toBe(51.439)
  expect(roundForReport(5.479134)).toBe(5.479)
})

test('a place report sends only the rounded spot, never the exact one', async () => {
  await reportPlace({ category: 'dark_area', latitude: 51.438527, longitude: 5.479134 })

  expect(rpc).toHaveBeenCalledWith('report_place', {
    category: 'dark_area',
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
