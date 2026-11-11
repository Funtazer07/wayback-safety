import type { BrokenLight } from './brokenLights.ts'
import type { PlaceReport } from '../reports/reports.ts'
import { measureFromLine, metresFrom } from './geometry.ts'
import { lampReach, type MeasuredRoute } from './lamps.ts'

export type RouteReports = {
  quietLabel?: 'Quiet' | 'More quiet'
  quietCount: number
  darkCount: number
  unsafeCount: number
  otherCount: number
  brokenCount: number
}

// Assumption: 100 m includes the uncertainty of reports rounded to about 110 × 70 m.
export const routeReportReach = 100

export function reportsAlongRoutes(
  routes: MeasuredRoute[],
  reports: PlaceReport[],
  brokenLights: BrokenLight[] = [],
): RouteReports[] {
  const counts = routes.map((route) => {
    const result: RouteReports = {
      quietCount: 0,
      darkCount: 0,
      unsafeCount: 0,
      otherCount: 0,
      brokenCount: route.brokenCount,
    }
    const origin = route.coordinates[0]
    if (!origin || route.coordinates.length < 2) return result
    const project = metresFrom(origin)
    const line = route.coordinates.map(project)
    const nearbyBroken = brokenLights.filter(
      (light) => measureFromLine(line, project(light.coordinates)).distance <= lampReach,
    ).length
    // An exact lamp belongs to the route only within the same corridor used for lamp ranking.
    result.brokenCount = Math.max(result.brokenCount, nearbyBroken)
    for (const report of reports) {
      if (measureFromLine(line, project(report.coordinates)).distance > routeReportReach) continue
      if (report.category === 'quiet') result.quietCount++
      else if (report.category === 'dark_area') result.darkCount++
      else if (report.category === 'unsafe') result.unsafeCount++
      else if (report.category === 'other') result.otherCount++
      else if (report.category === 'broken_light') result.brokenCount++
    }
    return result
  })
  const densities = counts.map(
    (count, index) => count.quietCount / Math.max(0.001, routes[index].length / 1000),
  )
  const positive = densities.filter((value) => value > 0)
  const highest = Math.max(0, ...positive)
  const hasComparison = positive.some((value) => value < highest)
  return counts.map((count, index) => ({
    ...count,
    quietLabel:
      count.quietCount === 0
        ? undefined
        : hasComparison && densities[index] === highest
          ? 'More quiet'
          : 'Quiet',
  }))
}
