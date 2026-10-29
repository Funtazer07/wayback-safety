import type { LngLat } from './geometry.ts'

// Kept on this phone only and erased when the walk ends: the start is often the user's home.
const storageKey = 'wayback.walkRoute'

export type PlannedRoute = {
  coordinates: LngLat[]
  seconds: number
  metres: number
}

type SavedRoute = {
  walkId: string
  coordinates: LngLat[]
  seconds?: number
}

export function saveWalkRoute(walkId: string, coordinates: LngLat[], seconds?: number): void {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ walkId, coordinates, seconds } satisfies SavedRoute),
    )
  } catch {
    // Storage is blocked (private mode): the walk shows no route.
  }
}

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
  } catch {}
}
