import { beforeEach, expect, test, vi } from 'vitest'
import {
  fetchBrokenLights,
  isReportedBroken,
  markLightWorking,
  reportBrokenLight,
  type BrokenLight,
} from './brokenLights.ts'
import type { Lamp } from './lamps.ts'

const { rpc, single, not } = vi.hoisted(() => ({ rpc: vi.fn(), single: vi.fn(), not: vi.fn() }))

vi.mock('../../lib/supabase.ts', () => ({
  supabase: { rpc, from: () => ({ select: () => ({ not }) }) },
}))

const vestdijk: Lamp = {
  lampId: '776',
  coordinates: [5.478385, 51.441212],
  street: 'Vestdijk',
  number: '002',
}

beforeEach(() => {
  rpc.mockReset()
  single.mockReset()
  not.mockReset()
})

test('the broken lights everyone reported are loaded from the server', async () => {
  not.mockResolvedValue({
    data: [
      {
        lamp_id: '776',
        lat: 51.441212,
        lng: 5.478385,
        street: 'Vestdijk',
        created_at: '2026-10-16T22:30:00+00:00',
      },
    ],
    error: null,
  })

  expect(await fetchBrokenLights()).toEqual([
    {
      lampId: '776',
      coordinates: [5.478385, 51.441212],
      street: 'Vestdijk',
      reportedAt: '2026-10-16T22:30:00.000Z',
    },
  ])
  // Only lamp reports, not place reports.
  expect(not).toHaveBeenCalledWith('lamp_id', 'is', null)
})

test('loading the broken lights fails when the server refuses it', async () => {
  const error = new Error('Network error')
  not.mockResolvedValue({ data: null, error })

  await expect(fetchBrokenLights()).rejects.toBe(error)
})

test('a broken light is reported at the lamp’s own spot, not where the user is', async () => {
  rpc.mockReturnValue({ single })
  single.mockResolvedValue({ data: { created_at: '2026-10-16T22:30:00+00:00' }, error: null })

  const light = await reportBrokenLight(vestdijk)

  expect(rpc).toHaveBeenCalledWith('report_broken_light', {
    lamp_id: '776',
    lat: 51.441212,
    lng: 5.478385,
    street: 'Vestdijk',
  })
  expect(light.reportedAt).toBe('2026-10-16T22:30:00.000Z')
})

test('reporting a light that someone already reported fails', async () => {
  const error = new Error('This light is already reported as broken')
  rpc.mockReturnValue({ single })
  single.mockResolvedValue({ data: null, error })

  await expect(reportBrokenLight(vestdijk)).rejects.toBe(error)
})

test('"It works again" removes the report of that lamp', async () => {
  rpc.mockResolvedValue({ error: null })

  await markLightWorking('776')

  expect(rpc).toHaveBeenCalledWith('mark_light_working', { lamp_id: '776' })
})

test('knows when a street light is already reported', () => {
  const reports: BrokenLight[] = [
    { lampId: '776', coordinates: vestdijk.coordinates, street: 'Vestdijk', reportedAt: '' },
  ]

  expect(isReportedBroken(vestdijk, reports)).toBe(true)
  expect(isReportedBroken({ ...vestdijk, coordinates: [5.479, 51.44] }, reports)).toBe(false)
})
