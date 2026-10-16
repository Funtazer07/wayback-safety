import { fetchJson } from './fetchJson.ts'
import { isSameWay, type LngLat } from './geometry.ts'

export type Route = {
  coordinates: LngLat[]
  /** Walking time in seconds. */
  duration: number
}

// Free public route planners on OpenStreetMap data, run by FOSSGIS. Fine for a demo; a real app
// needs its own route planner or a paid one. The start point (often the user's location) is sent
// to them, see docs/backend.md.
const footRouter = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/'
const bikeRouter = 'https://routing.openstreetmap.de/routed-bike/route/v1/bike/'

// Assumption: an average walking pace of 5 km/h, to give the cycle-network route a walking time.
const walkingMetresPerSecond = 5000 / 3600
const maxRoutes = 3

type PlannerAnswer = {
  code?: string
  routes?: { geometry: { coordinates: LngLat[] }; duration: number; distance: number }[]
}

export function routeUrl(router: 'foot' | 'bike', from: LngLat, to: LngLat): string {
  const base = router === 'foot' ? footRouter : bikeRouter
  const params = new URLSearchParams({
    alternatives: '3',
    overview: 'full',
    geometries: 'geojson',
  })
  return `${base}${from.join(',')};${to.join(',')}?${params}`
}

/**
 * The walking routes, plus the main route through the cycle network: that one often follows
 * bigger, better lit roads, a useful extra choice. Routes that are almost the same are left out.
 */
export function routesFromAnswers(walking: unknown, cycling: unknown): Route[] {
  const candidates: Route[] = []
  const walkingAnswer = walking as PlannerAnswer | undefined
  const cyclingAnswer = cycling as PlannerAnswer | undefined

  if (walkingAnswer?.code === 'Ok') {
    for (const route of walkingAnswer.routes ?? []) {
      candidates.push({ coordinates: route.geometry.coordinates, duration: route.duration })
    }
  }
  const cyclingRoute = cyclingAnswer?.code === 'Ok' ? cyclingAnswer.routes?.[0] : undefined
  if (cyclingRoute) {
    candidates.push({
      coordinates: cyclingRoute.geometry.coordinates,
      duration: cyclingRoute.distance / walkingMetresPerSecond,
    })
  }

  const unique: Route[] = []
  for (const candidate of candidates) {
    if (!unique.some((route) => isSameWay(route.coordinates, candidate.coordinates))) {
      unique.push(candidate)
    }
  }
  return unique.slice(0, maxRoutes)
}

export async function fetchRoutes(from: LngLat, to: LngLat, signal: AbortSignal): Promise<Route[]> {
  const [walking, cycling] = await Promise.allSettled([
    fetchJson(routeUrl('foot', from, to), signal),
    fetchJson(routeUrl('bike', from, to), signal),
  ])
  if (signal.aborted) throw new Error('Planning was stopped')
  return routesFromAnswers(
    walking.status === 'fulfilled' ? walking.value : undefined,
    cycling.status === 'fulfilled' ? cycling.value : undefined,
  )
}
