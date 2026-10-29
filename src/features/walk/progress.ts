import {
  distanceInMetres,
  lineLength,
  measureFromLine,
  metresFrom,
  type LngLat,
} from '../map/geometry.ts'

// Works out on the phone how the walk is going. It only decides whether to ask the walker: the app
// never moves the deadline by itself.

export type Fix = { coordinates: LngLat; accuracy: number; at: Date }

// Assumption: all values below are guesses, to be tuned after testing on the street.
// In a city 50 m is often one street off.
export const MAX_ACCURACY_METRES = 50
export const ARRIVED_METRES = 50
// Off the route, the distance left is a straight line, made a bit longer.
const OFF_ROUTE_METRES = 150
const DETOUR_FACTOR = 1.3
// Someone who stopped may need help, so only a walker who moves toward home gets a suggestion.
const MOVED_METRES = 30
const CLOSER_METRES = 20
const RECENT_MS = 4 * 60_000
// About 4.7 km/h.
const DEFAULT_SPEED = 1.3
const LATE_MINUTES = 2
const MAX_SUGGESTION = 30

function usable(fixes: Fix[], now: Date): Fix[] {
  return fixes.filter(
    (fix) => fix.accuracy <= MAX_ACCURACY_METRES && now.getTime() - fix.at.getTime() <= RECENT_MS,
  )
}

export function metresLeft(route: LngLat[], point: LngLat): number {
  const toMetres = metresFrom(route[0])
  const line = route.map(toMetres)
  const { distance, along } = measureFromLine(line, toMetres(point))
  if (distance > OFF_ROUTE_METRES) {
    return distanceInMetres(point, route[route.length - 1]) * DETOUR_FACTOR
  }
  return Math.max(0, lineLength(line) - along)
}

export function hasArrived(route: LngLat[] | null, fixes: Fix[], now: Date): boolean {
  if (!route || route.length < 2) return false
  const latest = usable(fixes, now).at(-1)
  if (!latest) return false
  return distanceInMetres(latest.coordinates, route[route.length - 1]) <= ARRIVED_METRES
}

type LateInput = {
  route: LngLat[] | null
  routeSeconds: number | null
  fixes: Fix[]
  deadline: Date
  now: Date
}

/** Minutes to suggest adding, rounded up to 5, or null when there is nothing to suggest. */
export function suggestedExtension({
  route,
  routeSeconds,
  fixes,
  deadline,
  now,
}: LateInput): number | null {
  if (!route || route.length < 2 || deadline.getTime() <= now.getTime()) return null
  const recent = usable(fixes, now)
  if (recent.length < 2) return null
  const first = recent[0]
  const latest = recent[recent.length - 1]

  const moved = distanceInMetres(first.coordinates, latest.coordinates)
  const leftBefore = metresLeft(route, first.coordinates)
  const leftNow = metresLeft(route, latest.coordinates)
  if (moved < MOVED_METRES || leftBefore - leftNow < CLOSER_METRES) return null
  if (leftNow <= ARRIVED_METRES) return null

  const routeMetres = lineLength(route.map(metresFrom(route[0])))
  const speed = routeSeconds && routeMetres > 0 ? routeMetres / routeSeconds : DEFAULT_SPEED
  const arrivesAt = now.getTime() + (leftNow / speed) * 1000
  const lateMinutes = (arrivesAt - deadline.getTime()) / 60_000
  if (lateMinutes < LATE_MINUTES) return null

  return Math.min(MAX_SUGGESTION, Math.ceil(lateMinutes / 5) * 5)
}
