import { expect, test } from 'vitest'
import type { LngLat } from './geometry.ts'
import { routesFromAnswers, routeUrl } from './routes.ts'

function line(longitude: number): LngLat[] {
  return Array.from({ length: 20 }, (_, step) => [longitude, 51.4385 + step * 0.0002])
}

function answer(...routes: { longitude: number; duration: number; distance: number }[]) {
  return {
    code: 'Ok',
    routes: routes.map(({ longitude, duration, distance }) => ({
      geometry: { coordinates: line(longitude) },
      duration,
      distance,
    })),
  }
}

test('asks the walking route planner for alternatives between two spots', () => {
  const url = new URL(routeUrl('foot', [5.4791, 51.4385], [5.4797, 51.4433]))

  expect(url.pathname).toContain('/foot/5.4791,51.4385;5.4797,51.4433')
  expect(url.searchParams.get('alternatives')).toBe('3')
  expect(url.searchParams.get('geometries')).toBe('geojson')
})

test('adds the cycle-network route with a walking time at 5 km/h', () => {
  const routes = routesFromAnswers(
    answer({ longitude: 5.479, duration: 660, distance: 812 }),
    answer({ longitude: 5.482, duration: 240, distance: 1150 }),
  )

  expect(routes).toHaveLength(2)
  expect(routes[0].duration).toBe(660)
  expect(routes[1].duration).toBeCloseTo(828, 0)
})

test('leaves out a route that goes over the same streets', () => {
  const routes = routesFromAnswers(
    answer({ longitude: 5.479, duration: 660, distance: 812 }),
    answer({ longitude: 5.479, duration: 300, distance: 812 }),
  )

  expect(routes).toHaveLength(1)
})

test('keeps at most three routes', () => {
  const routes = routesFromAnswers(
    answer(
      { longitude: 5.47, duration: 600, distance: 800 },
      { longitude: 5.475, duration: 620, distance: 820 },
      { longitude: 5.48, duration: 640, distance: 840 },
      { longitude: 5.485, duration: 660, distance: 860 },
    ),
    undefined,
  )

  expect(routes).toHaveLength(3)
})

test('gives no routes when the route planner found none', () => {
  expect(routesFromAnswers({ code: 'NoRoute' }, undefined)).toEqual([])
})
