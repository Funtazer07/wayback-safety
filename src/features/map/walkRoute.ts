import type { LngLat } from './geometry.ts'

// The route chosen on Home, kept for the walk that was started with it, so the walk screen can
// show it, also after the app was closed and opened again. Kept on this phone only, and erased
// when the walk ends. It holds the start, which is often where the user was: see docs/map.md.
const storageKey = 'wayback.walkRoute'

/** The route on the Home map, with what the start-walk screen shows about it (screen 04). */
export type PlannedRoute = {
  coordinates: LngLat[]
  /** Walking time in seconds, from the route planner. */
  seconds: number
  /** Length in metres. */
  metres: number
}

type SavedRoute = {
  walkId: string
  coordinates: LngLat[]
  /** The route planner's walking time, to know the walker's pace ("Running late?", SCRUM-113). */
  seconds?: number
}

export function saveWalkRoute(walkId: string, coordinates: LngLat[], seconds?: number): void {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ walkId, coordinates, seconds } satisfies SavedRoute),
    )
  } catch {
    // Storage is blocked (private mode): the walk screen then shows no route.
  }
}

/** The route of this walk, or null when the walk was started without one. */
export function loadWalkRoute(walkId: string): LngLat[] | null {
  try {
    const saved = JSON.parse(
      localStorage.getItem(storageKey) ?? 'null',
    ) as Partial<SavedRoute> | null
    if (saved?.walkId !== walkId || !Array.isArray(saved.coordinates)) return null
    return saved.coordinates.length > 1 ? saved.coordinates : null
  } catch {
    return null
  }
}

/** The walking time of this walk's route in seconds, or null when it is not known. */
export function loadWalkRouteSeconds(walkId: string): number | null {
  try {
    const saved = JSON.parse(
      localStorage.getItem(storageKey) ?? 'null',
    ) as Partial<SavedRoute> | null
    return saved?.walkId === walkId && typeof saved.seconds === 'number' ? saved.seconds : null
  } catch {
    return null
  }
}

export function clearWalkRoute(): void {
  try {
    localStorage.removeItem(storageKey)
  } catch {
    // Storage is blocked: there is nothing saved to erase.
  }
}
