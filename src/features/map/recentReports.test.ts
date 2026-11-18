
import { describe, expect, it } from 'vitest'
import type { PlaceReport } from '../reports/reports.ts'
import type { BrokenLight } from './brokenLights.ts'
import type { LngLat } from './geometry.ts'
import { getRecentReports } from './recentReports.ts'

// use the same time for each test
const NOW = new Date('2026-11-18T12:00:00Z')

// example location in Eindhoven
const USER: LngLat = [5.4697, 51.4416]

// example route for testing
const ROUTE: LngLat[] = [
  [5.4697, 51.4416],
  [5.4800, 51.4416],
]

// make a report for the tests
function makeReport(
  id: string,
  coordinates: LngLat,
  minutesAgo: number,
): PlaceReport {
  return {
    id,
    category: 'dark_area',
    coordinates,
    reportedAt: new Date(
      NOW.getTime() - minutesAgo * 60_000,
    ),
  }
}

describe('SCRUM-141: Recent Reports', () => {

  // a recent report should show up
  it('T01 - shows a report from 20 minutes ago', () => {
    const reports = [
      makeReport('recent', USER, 20),
    ]

    const result = getRecentReports(
      reports,
      [],
      USER,
      null,
      NOW,
    )

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('recent')
  })

  // reports older than 3 hours should not show up
  it('T02 - hides reports older than 3 hours', () => {
    const reports = [
      makeReport('old', USER, 300),
    ]

    const result = getRecentReports(
      reports,
      [],
      USER,
      null,
      NOW,
    )

    expect(result).toHaveLength(0)
  })

  // reports close to the user should show up
  it('T03 - finds reports near the user', () => {
    const reports = [
      makeReport('near-user', USER, 30),
    ]

    const result = getRecentReports(
      reports,
      [],
      USER,
      null,
      NOW,
    )

    expect(result).toHaveLength(1)
    expect(result[0].nearUser).toBe(true)
  })

  // reports too far away should not show up
  it('T04 - ignores reports far away', () => {
    const reports = [
      makeReport(
        'far-away',
        [5.5500, 51.5000],
        20,
      ),
    ]

    const result = getRecentReports(
      reports,
      [],
      USER,
      ROUTE,
      NOW,
    )

    expect(result).toHaveLength(0)
  })

  // reports close to the route should show up
  it('T05 - finds reports near the route', () => {
    const reports = [
      makeReport(
        'near-route',
        [5.4750, 51.4416],
        25,
      ),
    ]

    const result = getRecentReports(
      reports,
      [],
      null,
      ROUTE,
      NOW,
    )

    expect(result).toHaveLength(1)
    expect(result[0].nearRoute).toBe(true)
  })

  // include recent broken streetlights
  it('T06 - includes recent broken lights', () => {
    const brokenLights: BrokenLight[] = [
      {
        lampId: 'lamp-123',
        coordinates: USER,
        street: 'Test Street',
        reportedAt: new Date(
          NOW.getTime() - 30 * 60_000,
        ).toISOString(),
      },
    ]

    const result = getRecentReports(
      [],
      brokenLights,
      USER,
      null,
      NOW,
    )

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('lamp-123')
    expect(result[0].kind).toBe('broken_light')
  })

  // newest reports should be at the top
  it('T07 - sorts reports from newest to oldest', () => {
    const reports = [
      makeReport('oldest', USER, 150),
      makeReport('newest', USER, 10),
      makeReport('middle', USER, 60),
    ]

    const result = getRecentReports(
      reports,
      [],
      USER,
      null,
      NOW,
    )

    expect(result.map((report) => report.id)).toEqual([
      'newest',
      'middle',
      'oldest',
    ])
  })

  // without a location or route, there are no nearby results
  it('T08 - returns nothing without location or route', () => {
    const reports = [
      makeReport('example', USER, 20),
    ]

    const result = getRecentReports(
      reports,
      [],
      null,
      null,
      NOW,
    )

    expect(result).toHaveLength(0)
  })

})
