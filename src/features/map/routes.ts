import { supabase } from '../../lib/supabase.ts'
import { sharedPart, type LngLat } from './geometry.ts'

export type Route = {
  coordinates: LngLat[]
  duration: number
}

const maxRoutes = 3
// Testers found routes that differ in a street or two no real choice. Assumption: a route that
// runs for more than 70% along one already kept is left out.
const maxSharedPart = 0.7
// The Edge Function asks for a walking and a cycle route, each with its own 12 second limit.
const requestTimeout = 30_000

type PlannerAnswer = { routes?: { coordinates?: unknown; duration?: unknown }[] }

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

/** The server sends walking routes first and the cycle-network route last. */
export function routesFromAnswer(answer: unknown): Route[] {
  const unique: Route[] = []
  for (const route of (answer as PlannerAnswer | null)?.routes ?? []) {
    if (!Array.isArray(route.coordinates) || typeof route.duration !== 'number') continue
    const candidate: Route = {
      coordinates: route.coordinates as LngLat[],
      duration: route.duration,
    }
    if (
      !unique.some((kept) => sharedPart(kept.coordinates, candidate.coordinates) > maxSharedPart)
    ) {
      unique.push(candidate)
    }
  }
  return unique.slice(0, maxRoutes)
}

export async function fetchRoutes(from: LngLat, to: LngLat, signal: AbortSignal): Promise<Route[]> {
  const { data, error } = await client().functions.invoke('plan-route', {
    body: { from, to },
    signal,
    timeout: requestTimeout,
  })
  if (signal.aborted) throw new Error('Planning was stopped')
  if (error) throw error
  return routesFromAnswer(data)
}
