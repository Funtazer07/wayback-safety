import type { PlaceReport } from '../reports/reports.ts'
import type { BrokenLight } from './brokenLights.ts'
import { distanceInMetres, measureFromLine, metresFrom, type LngLat } from './geometry.ts'

// Assumption: older reports say little about the street right now.
export const RECENT_HOURS = 3
// Assumption: about four minutes of walking around the user.
export const NEAR_USER_METRES = 300
// Assumption: close enough to the route to be seen from it.
export const NEAR_ROUTE_METRES = 100

export type RecentReport = {
  id: string
  kind: 'place' | 'broken_light'
  category: PlaceReport['category']
  coordinates: LngLat
  reportedAt: Date
  nearUser: boolean
  nearRoute: boolean
}

/** Reports of the last few hours near the user or the route, newest first. */
export function getRecentReports(
  placeReports: PlaceReport[],
  brokenLights: BrokenLight[],
  userPosition: LngLat | null,
  route: LngLat[] | null,
  now = new Date(),
): RecentReport[] {
  const latest = now.getTime()
  const earliest = latest - RECENT_HOURS * 60 * 60 * 1000

  const allReports = [
    ...placeReports.map((report) => ({
      id: report.id,
      kind: 'place' as const,
      category: report.category,
      coordinates: report.coordinates,
      reportedAt: report.reportedAt,
    })),
    ...brokenLights.map((light) => ({
      id: light.lampId,
      kind: 'broken_light' as const,
      category: 'broken_light' as const,
      coordinates: light.coordinates,
      reportedAt: new Date(light.reportedAt),
    })),
  ]

  const project = route && route.length >= 2 ? metresFrom(route[0]) : null
  const routeInMetres = project && route ? route.map(project) : null

  return allReports
    .flatMap((report): RecentReport[] => {
      const time = report.reportedAt.getTime()
      // NaN fails both checks, so a broken date is left out too.
      if (!(time >= earliest && time <= latest)) return []

      const nearUser =
        userPosition !== null &&
        distanceInMetres(userPosition, report.coordinates) <= NEAR_USER_METRES
      const nearRoute =
        project !== null &&
        routeInMetres !== null &&
        measureFromLine(routeInMetres, project(report.coordinates)).distance <= NEAR_ROUTE_METRES

      return nearUser || nearRoute ? [{ ...report, nearUser, nearRoute }] : []
    })
    .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime())
}
