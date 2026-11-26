import { describe, expect, it } from 'vitest'
import type { PlaceReport } from '../reports/reports.ts'
import type { BrokenLight } from './brokenLights.ts'
import type { LngLat } from './geometry.ts'
import { getRecentReports } from './recentReports.ts'

const NOW = new Date('2026-11-18T22:00:00Z')

// Stationsplein, Eindhoven.
const USER: LngLat = [5.4797, 51.4433]

// About 800 m east from Stationsplein.
const ROUTE: LngLat[] = [
  [5.4797, 51.4433],
  [5.4912, 51.4433],
]

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60_000)
}

function placeReport(id: string, coordinates: LngLat, minutes: number): PlaceReport {
  return { id, category: 'dark_area', coordinates, reportedAt: minutesAgo(minutes) }
}

describe('getRecentReports', () => {
  it('shows a report from 20 minutes ago next to the user', () => {
    const result = getRecentReports([placeReport('a', USER, 20)], [], USER, null, NOW)

    expect(result).toEqual([
      expect.objectContaining({ id: 'a', kind: 'place', nearUser: true, nearRoute: false }),
    ])
  })

  it('leaves out reports older than three hours', () => {
    const result = getRecentReports([placeReport('old', USER, 181)], [], USER, null, NOW)

    expect(result).toEqual([])
  })

  it('leaves out reports with a time in the future or a broken date', () => {
    const future = placeReport('future', USER, -10)
    const broken = { ...placeReport('broken', USER, 10), reportedAt: new Date('not a date') }

    expect(getRecentReports([future, broken], [], USER, null, NOW)).toEqual([])
  })

  it('leaves out reports far from both the user and the route', () => {
    const result = getRecentReports([placeReport('far', [5.55, 51.5], 20)], [], USER, ROUTE, NOW)

    expect(result).toEqual([])
  })

  it('finds a report next to the route when the user is far away', () => {
    const halfway: LngLat = [5.486, 51.4434]

    const result = getRecentReports([placeReport('route', halfway, 25)], [], null, ROUTE, NOW)

    expect(result).toEqual([expect.objectContaining({ nearUser: false, nearRoute: true })])
  })

  it('includes broken street lights reported recently', () => {
    const light: BrokenLight = {
      lampId: 'lamp-123',
      coordinates: USER,
      street: 'Stationsplein',
      reportedAt: minutesAgo(30).toISOString(),
    }

    const result = getRecentReports([], [light], USER, null, NOW)

    expect(result).toEqual([
      expect.objectContaining({ id: 'lamp-123', kind: 'broken_light', category: 'broken_light' }),
    ])
  })

  it('puts the newest report first', () => {
    const reports = [
      placeReport('oldest', USER, 150),
      placeReport('newest', USER, 10),
      placeReport('middle', USER, 60),
    ]

    const result = getRecentReports(reports, [], USER, null, NOW)

    expect(result.map((report) => report.id)).toEqual(['newest', 'middle', 'oldest'])
  })

  it('finds nothing without a location or a route', () => {
    const result = getRecentReports([placeReport('a', USER, 20)], [], null, null, NOW)

    expect(result).toEqual([])
  })
})
