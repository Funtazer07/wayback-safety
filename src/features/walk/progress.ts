import {
  distanceInMetres,
  lineLength,
  measureFromLine,
  metresFrom,
  type LngLat,
} from '../map/geometry.ts'

/**
 * How the walk is going, worked out on the phone from the planned route and the last positions
 * (SCRUM-112, SCRUM-113). Chosen in the SCRUM-97 ideation: the reminder before the end is the base,
 * and this makes the app smarter while it is open. A web app cannot read the location while the
 * phone is locked, so none of this runs then. Nothing here goes to the server.
 *
 * The client's rule: the app never moves the deadline by itself. These functions only decide
 * whether to ask the walker.
 */

/** One position of the phone. */
export type Fix = { coordinates: LngLat; accuracy: number; at: Date }

// Assumptions, from the SCRUM-97 ideation, to be tuned after testing on the street:
// A position less exact than this is not used: in a city 50 m is often one street off.
export const MAX_ACCURACY_METRES = 50
// Within this distance of the route's end the walker counts as arrived.
export const ARRIVED_METRES = 50
// Further than this from the route, the walker took another way; the distance left is then
// estimated as a straight line, a bit longer, as streets are not straight.
const OFF_ROUTE_METRES = 150
const DETOUR_FACTOR = 1.3
// Moving at least this far between the oldest and newest recent position, and getting this much
// closer to home, counts as "on the way". Less means stopped or walking away: then no suggestion,
// because someone who stopped may need help, and the normal "Are you okay?" path takes over.
const MOVED_METRES = 30
const CLOSER_METRES = 20
// Only positions from the last few minutes count.
const RECENT_MS = 4 * 60_000
// Walking speed when the route planner gave no time: about 4.7 km/h.
const DEFAULT_SPEED = 1.3
// Suggest only when the walker will be at least this late, and never more than 30 minutes.
const LATE_MINUTES = 2
const MAX_SUGGESTION = 30

function usable(fixes: Fix[], now: Date): Fix[] {
  return fixes.filter(
    (fix) => fix.accuracy <= MAX_ACCURACY_METRES && now.getTime() - fix.at.getTime() <= RECENT_MS,
  )
}

/** Metres left to the end of the route from this point. */
export function metresLeft(route: LngLat[], point: LngLat): number {
  const toMetres = metresFrom(route[0])
  const line = route.map(toMetres)
  const { distance, along } = measureFromLine(line, toMetres(point))
  if (distance > OFF_ROUTE_METRES) {
    return distanceInMetres(point, route[route.length - 1]) * DETOUR_FACTOR
  }
  return Math.max(0, lineLength(line) - along)
}

/** True when the newest good position is at the end of the route: "Are you home?" (SCRUM-112). */
export function hasArrived(route: LngLat[] | null, fixes: Fix[], now: Date): boolean {
  if (!route || route.length < 2) return false
  const latest = usable(fixes, now).at(-1)
  if (!latest) return false
  return distanceInMetres(latest.coordinates, route[route.length - 1]) <= ARRIVED_METRES
}

type LateInput = {
  route: LngLat[] | null
  /** The route planner's walking time for the whole route, to know this walker's pace. */
  routeSeconds: number | null
  fixes: Fix[]
  deadline: Date
  now: Date
}

/**
 * How many minutes to suggest adding ("Running late? Add 10 minutes?", SCRUM-113), or null when
 * there is nothing to suggest: no route, no recent good positions, not moving toward home, already
 * home, or on time. Rounded up to 5 minutes, like the buttons.
 */
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
