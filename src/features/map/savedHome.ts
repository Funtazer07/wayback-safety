import type { LngLat } from './geometry.ts'
import type { Place } from './places.ts'

// Kept on this phone only, never sent to our server: a home address is very personal.
const storageKey = 'wayback.home'

export type SavedHome = Pick<Place, 'label' | 'coordinates'>

function isLngLat(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((number) => typeof number === 'number' && Number.isFinite(number))
  )
}

export function loadHome(): SavedHome | null {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Partial<SavedHome>
    if (typeof saved?.label !== 'string' || !isLngLat(saved.coordinates)) return null
    return { label: saved.label, coordinates: saved.coordinates }
  } catch {
    return null
  }
}

export function saveHome(home: SavedHome): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(home))
  } catch {
    // Storage is blocked (private mode): the home is kept until the app closes.
  }
}

export function clearHome(): void {
  try {
    localStorage.removeItem(storageKey)
  } catch {}
}
