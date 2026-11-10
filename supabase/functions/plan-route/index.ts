// Edge Function (Deno) that plans walking routes with OpenRouteService, so the key stays on the
// server. Only signed-in users can call it (Verify JWT on). Deployed by hand: see docs/backend.md,
// "Planning a route". The rules live in ./planRoute.ts, which is tested.

import {
  directionsRequest,
  outcomeOf,
  readTrip,
  routesFromAnswer,
  type LngLat,
  type PlannedRoute,
  type Profile,
} from './planRoute.ts'

// The app runs on another address than Supabase, so the browser asks first (CORS).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// The old api.openrouteservice.org address is being shut off. If HeiGIT moves again, set the new
// address in the ORS_URL secret instead of changing the code.
const defaultServiceUrl = 'https://api.heigit.org/openrouteservice'
const requestTimeout = 12_000

function secret(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Edge Function secret ${name} is missing. See docs/backend.md.`)
  return value
}

type Directions = { outcome: ReturnType<typeof outcomeOf>; routes: PlannedRoute[] }

async function directions(profile: Profile, from: LngLat, to: LngLat): Promise<Directions> {
  const serviceUrl = Deno.env.get('ORS_URL') ?? defaultServiceUrl
  const response = await fetch(`${serviceUrl}/v2/directions/${profile}/geojson`, {
    method: 'POST',
    headers: { Authorization: secret('ORS_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify(directionsRequest(profile, from, to)),
    signal: AbortSignal.timeout(requestTimeout),
  })
  const outcome = outcomeOf(response.status)
  if (outcome !== 'routes') {
    await response.body?.cancel()
    return { outcome, routes: [] }
  }
  return { outcome, routes: routesFromAnswer(await response.json(), profile) }
}

function answer(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders })
}

async function planRoute(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return answer({ error: 'Use POST' }, 405)

  const trip = readTrip(await request.json().catch(() => null))
  if (!trip) return answer({ error: 'Expected { from, to } inside Eindhoven' }, 400)

  const [walking, cycling] = await Promise.allSettled([
    directions('foot-walking', trip.from, trip.to),
    directions('cycling-regular', trip.from, trip.to),
  ])
  if (walking.status === 'rejected') throw walking.reason

  const { outcome } = walking.value
  if (outcome === 'busy') return answer({ error: 'The route planner is busy' }, 503)
  if (outcome === 'failed') return answer({ error: 'The route planner did not answer' }, 502)

  // Walking routes first: when the cycle route follows the same streets, the phone keeps walking.
  const cyclingRoutes = cycling.status === 'fulfilled' ? cycling.value.routes.slice(0, 1) : []
  return answer({ routes: [...walking.value.routes, ...cyclingRoutes] })
}

Deno.serve(async (request) => {
  try {
    return await planRoute(request)
  } catch (error) {
    // Never log the trip itself: it holds where the user is.
    console.error(error instanceof Error ? error.message : String(error))
    return answer({ error: 'Could not plan a route' }, 500)
  }
})
