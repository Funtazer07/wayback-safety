// What plan-route asks OpenRouteService and how it reads the answer. No Deno imports, so Vitest can
// test it. It stays next to index.ts because the Supabase dashboard editor cannot import from other
// folders.

/** Longitude first, as in GeoJSON. */
export type LngLat = [longitude: number, latitude: number]

export type Profile = 'foot-walking' | 'cycling-regular'

/** distance in metres, duration in seconds of walking. */
export type PlannedRoute = {
  coordinates: LngLat[]
  distance: number
  duration: number
}

// Must match eindhovenBounds in src/features/map/geometry.ts. Keeps our free quota for Eindhoven.
const eindhovenBounds: [LngLat, LngLat] = [
  [5.35, 51.35],
  [5.6, 51.53],
]

// Assumption: 5 km/h, to give the cycle-network route a walking time.
const walkingMetresPerSecond = 5000 / 3600

function isLngLat(value: unknown): value is LngLat {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((number) => typeof number === 'number' && Number.isFinite(number))
  )
}

function isInEindhoven([longitude, latitude]: LngLat): boolean {
  const [[west, south], [east, north]] = eindhovenBounds
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north
}

/** The phone sends { from, to }. Anything else, or a spot outside Eindhoven, is refused. */
export function readTrip(body: unknown): { from: LngLat; to: LngLat } | null {
  const { from, to } = (body ?? {}) as { from?: unknown; to?: unknown }
  if (!isLngLat(from) || !isLngLat(to)) return null
  if (!isInEindhoven(from) || !isInEindhoven(to)) return null
  return { from, to }
}

/** Walking gets up to three different routes; cycling only its best one. */
export function directionsRequest(profile: Profile, from: LngLat, to: LngLat) {
  return {
    coordinates: [from, to],
    instructions: false,
    ...(profile === 'foot-walking' && {
      // Assumption: the service's suggested values; a higher share_factor gives more overlap.
      alternative_routes: { target_count: 3, share_factor: 0.6, weight_factor: 1.4 },
    }),
  }
}

type DirectionsAnswer = {
  features?: {
    geometry?: { coordinates?: unknown }
    properties?: { summary?: { distance?: number; duration?: number } }
  }[]
}

/** The cycle route's own time is for cycling, so it gets a walking time from its length. */
export function routesFromAnswer(answer: unknown, profile: Profile): PlannedRoute[] {
  const routes: PlannedRoute[] = []
  for (const feature of (answer as DirectionsAnswer | null)?.features ?? []) {
    const coordinates = feature.geometry?.coordinates
    const distance = feature.properties?.summary?.distance ?? 0
    const duration = feature.properties?.summary?.duration ?? 0
    if (!Array.isArray(coordinates) || !coordinates.every(isLngLat) || coordinates.length < 2) {
      continue
    }
    routes.push({
      coordinates,
      distance,
      duration: profile === 'foot-walking' ? duration : distance / walkingMetresPerSecond,
    })
  }
  return routes
}

/**
 * 404 means OpenRouteService found no route, for example to a spot far from any street. That is an
 * answer, not a failure. 403 and 429 mean the daily or per-minute limit is used up.
 */
export function outcomeOf(status: number): 'routes' | 'no-route' | 'busy' | 'failed' {
  if (status >= 200 && status < 300) return 'routes'
  if (status === 404) return 'no-route'
  if (status === 403 || status === 429) return 'busy'
  return 'failed'
}
