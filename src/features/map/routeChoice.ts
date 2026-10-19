import type { MeasuredRoute } from './lamps.ts'

export function fastestIndex(routes: MeasuredRoute[]): number {
  return routes.reduce(
    (best, route, index) => (route.duration < routes[best].duration ? index : best),
    0,
  )
}

/** The route with the most street lights per km; on a tie, the one with the shortest dark piece. */
export function mostLightsIndex(routes: MeasuredRoute[]): number {
  return routes.reduce((best, route, index) => {
    const bestRoute = routes[best]
    if (route.lampsPerKm > bestRoute.lampsPerKm) return index
    if (route.lampsPerKm === bestRoute.lampsPerKm && route.longestDark < bestRoute.longestDark) {
      return index
    }
    return best
  }, 0)
}

/** The route with the most street lights comes first, so it is the one shown and suggested. */
export function mostLightsFirst(routes: MeasuredRoute[]): MeasuredRoute[] {
  if (routes.length === 0) return routes
  const recommended = routes[mostLightsIndex(routes)]
  return [recommended, ...routes.filter((route) => route !== recommended)]
}
