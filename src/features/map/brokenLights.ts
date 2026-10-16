import { placeOf, type LngLat } from './geometry.ts'
import type { Lamp } from './lamps.ts'

/** A street light a user reported as broken. */
export type BrokenLight = {
  lampId: string
  coordinates: LngLat
  street: string
  /** ISO date and time. */
  reportedAt: string
}

// For now reports are kept on this device only. They move to the reports table in Supabase
// (SCRUM-92) once it is ready: then only these two functions change, the screens stay the same.
const storageKey = 'wayback.brokenLights'

function isBrokenLight(value: unknown): value is BrokenLight {
  if (typeof value !== 'object' || value === null) return false
  const light = value as Record<string, unknown>
  return (
    typeof light.lampId === 'string' &&
    Array.isArray(light.coordinates) &&
    light.coordinates.length === 2 &&
    light.coordinates.every((value) => typeof value === 'number') &&
    typeof light.street === 'string' &&
    typeof light.reportedAt === 'string'
  )
}

export function loadBrokenLights(): BrokenLight[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(saved) ? saved.filter(isBrokenLight) : []
  } catch {
    // Storage can be blocked (private mode) or hold broken data. Start empty instead of crashing.
    return []
  }
}

export function saveBrokenLights(lights: BrokenLight[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(lights))
  } catch {
    // Storage is blocked: the reports stay until the page is closed.
  }
}

export function brokenLightFrom(lamp: Lamp, now: Date): BrokenLight {
  return {
    lampId: lamp.lampId,
    coordinates: lamp.coordinates,
    street: lamp.street,
    reportedAt: now.toISOString(),
  }
}

export function brokenPlaces(lights: BrokenLight[]): Set<string> {
  return new Set(lights.map((light) => placeOf(light.coordinates)))
}

export function isReportedBroken(lamp: Lamp, lights: BrokenLight[]): boolean {
  return brokenPlaces(lights).has(placeOf(lamp.coordinates))
}
