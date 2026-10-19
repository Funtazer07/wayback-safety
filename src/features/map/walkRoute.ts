import type { LngLat } from './geometry.ts'

// The route chosen on Home, kept for the walk that was started with it, so the walk screen can
// show it, also after the app was closed and opened again. Kept on this phone only, and erased
// when the walk ends. It holds the start, which is often where the user was: see docs/map.md.
const storageKey = 'wayback.walkRoute'

type SavedRoute = {
  walkId: string
  coordinates: LngLat[]
}

export function saveWalkRoute(walkId: string, coordinates: LngLat[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ walkId, coordinates } satisfies SavedRoute))
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

export function clearWalkRoute(): void {
  try {
    localStorage.removeItem(storageKey)
  } catch {
    // Storage is blocked: there is nothing saved to erase.
  }
}
