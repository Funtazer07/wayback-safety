
import type { PlaceReport } from '../reports/reports.ts'
import type { BrokenLight } from './brokenLights.ts'
import {
  distanceInMetres,
  measureFromLine,
  metresFrom,
  type LngLat,
} from './geometry.ts'

// our starting settings
export const RECENT_HOURS = 3
export const NEAR_USER_METRES = 300
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

export function getRecentReports(
  placeReports: PlaceReport[],
  brokenLights: BrokenLight[],
  userPosition: LngLat | null,
  selectedRoute: LngLat[] | null,
  now = new Date(),
): RecentReport[] {
  // only accept reports from the last 3 hours.
  const nowMs = now.getTime()
  const earliest = nowMs - RECENT_HOURS * 60 * 60 * 1000

  // put both types of reports into one list.
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

  // prepare the selected route for distance checking.
  const routeOrigin = selectedRoute?.[0]
  const project = routeOrigin ? metresFrom(routeOrigin) : null
  const routeLine =
    project && selectedRoute && selectedRoute.length >= 2
      ? selectedRoute.map(project)
      : null

  return allReports
    .flatMap((report): RecentReport[] => {
      const timestamp = report.reportedAt.getTime()

      // ignore old, future, or invalid dates.
      if (
        !Number.isFinite(timestamp) ||
        timestamp < earliest ||
        timestamp > nowMs
      ) {
        return []
      }

      // check whether the report is near the user.
      const nearUser =
        userPosition !== null &&
        distanceInMetres(
          userPosition,
          report.coordinates,
        ) <= NEAR_USER_METRES

      // check whether it's near the chosen route.
      const nearRoute =
        routeLine !== null &&
        project !== null &&
        measureFromLine(
          routeLine,
          project(report.coordinates),
        ).distance <= NEAR_ROUTE_METRES

      // skip reports that are not nearby.
      if (!nearUser && !nearRoute) return []

      return [{ ...report, nearUser, nearRoute }]
    })
    // Newest first.
    .sort(
      (a, b) =>
        b.reportedAt.getTime() - a.reportedAt.getTime(),
    )
}
