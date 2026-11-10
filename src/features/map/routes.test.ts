import { beforeEach, expect, test, vi } from 'vitest'
import type { LngLat } from './geometry.ts'
import { fetchRoutes, routesFromAnswer } from './routes.ts'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('../../lib/supabase.ts', () => ({ supabase: { functions: { invoke } } }))

const station: LngLat = [5.4791, 51.4434]
const stratumseind: LngLat = [5.4797, 51.4433]

function line(longitude: number): LngLat[] {
  return Array.from({ length: 20 }, (_, step) => [longitude, 51.4385 + step * 0.0002])
}

function route(longitude: number, duration: number) {
  return { coordinates: line(longitude), distance: 800, duration }
}

/** The same line as route(5.479), but from point `from` on it takes a street about 140 m east. */
function detour(from: number, duration: number) {
  const coordinates = line(5.479).map(([longitude, latitude], index): LngLat =>
    index < from ? [longitude, latitude] : [longitude + 0.002, latitude],
  )
  return { coordinates, distance: 820, duration }
}

beforeEach(() => {
  invoke.mockReset()
})

test('asks our server for routes between two spots', async () => {
  invoke.mockResolvedValue({ data: { routes: [route(5.479, 660)] }, error: null })

  const routes = await fetchRoutes(station, stratumseind, new AbortController().signal)

  expect(invoke).toHaveBeenCalledWith(
    'plan-route',
    expect.objectContaining({ body: { from: station, to: stratumseind } }),
  )
  expect(routes).toEqual([{ coordinates: line(5.479), duration: 660 }])
})

test('planning fails when the server refuses it', async () => {
  invoke.mockResolvedValue({ data: null, error: new Error('The route planner is busy') })

  await expect(fetchRoutes(station, stratumseind, new AbortController().signal)).rejects.toThrow(
    'busy',
  )
})

test('leaves out a route that goes over the same streets', () => {
  const routes = routesFromAnswer({ routes: [route(5.479, 660), route(5.479, 828)] })

  expect(routes).toHaveLength(1)
  expect(routes[0].duration).toBe(660)
})

test('leaves out a route that only differs in its last streets', () => {
  const routes = routesFromAnswer({ routes: [route(5.479, 660), detour(16, 680)] })

  expect(routes).toHaveLength(1)
})

test('keeps a route that takes other streets for a good part of the way', () => {
  const routes = routesFromAnswer({ routes: [route(5.479, 660), detour(10, 700)] })

  expect(routes).toHaveLength(2)
})

test('keeps at most three routes', () => {
  const routes = routesFromAnswer({
    routes: [route(5.47, 600), route(5.475, 620), route(5.48, 640), route(5.485, 660)],
  })

  expect(routes).toHaveLength(3)
})

test('gives no routes when the route planner found none', () => {
  expect(routesFromAnswer({ routes: [] })).toEqual([])
  expect(routesFromAnswer(null)).toEqual([])
})
