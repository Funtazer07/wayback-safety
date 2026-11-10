import { expect, test } from 'vitest'
import {
  directionsRequest,
  outcomeOf,
  readTrip,
  routesFromAnswer,
  type LngLat,
} from './planRoute.ts'

const stratumseind: LngLat = [5.4797, 51.4433]
const station: LngLat = [5.4791, 51.4434]
const amsterdam: LngLat = [4.9041, 52.3676]

function line(longitude: number): LngLat[] {
  return Array.from({ length: 5 }, (_, step) => [longitude, 51.4385 + step * 0.0002])
}

function answer(...routes: { longitude: number; distance: number; duration: number }[]) {
  return {
    type: 'FeatureCollection',
    features: routes.map(({ longitude, distance, duration }) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: line(longitude) },
      properties: { summary: { distance, duration } },
    })),
  }
}

test('accepts a trip between two spots in Eindhoven', () => {
  expect(readTrip({ from: station, to: stratumseind })).toEqual({ from: station, to: stratumseind })
})

test('refuses a trip that leaves Eindhoven', () => {
  expect(readTrip({ from: station, to: amsterdam })).toBeNull()
})

test('refuses a trip without two spots', () => {
  expect(readTrip({ from: station })).toBeNull()
  expect(readTrip({ from: 'Stratumseind', to: stratumseind })).toBeNull()
  expect(readTrip({ from: [5.4797, Number.NaN], to: stratumseind })).toBeNull()
  expect(readTrip(null)).toBeNull()
})

test('asks for up to three walking routes', () => {
  const request = directionsRequest('foot-walking', station, stratumseind)

  expect(request.coordinates).toEqual([station, stratumseind])
  expect(request.alternative_routes?.target_count).toBe(3)
})

test('asks for one cycle route', () => {
  expect(directionsRequest('cycling-regular', station, stratumseind)).not.toHaveProperty(
    'alternative_routes',
  )
})

test('reads each walking route with its distance and walking time', () => {
  const routes = routesFromAnswer(
    answer(
      { longitude: 5.479, distance: 812, duration: 660 },
      { longitude: 5.482, distance: 950, duration: 760 },
    ),
    'foot-walking',
  )

  expect(routes).toHaveLength(2)
  expect(routes[0]).toEqual({ coordinates: line(5.479), distance: 812, duration: 660 })
})

test('gives the cycle route a walking time at 5 km/h', () => {
  const [route] = routesFromAnswer(
    answer({ longitude: 5.482, distance: 1150, duration: 240 }),
    'cycling-regular',
  )

  expect(route.duration).toBeCloseTo(828, 0)
})

test('skips a route without a usable line', () => {
  const broken = { features: [{ geometry: { coordinates: [[5.479]] }, properties: {} }] }

  expect(routesFromAnswer(broken, 'foot-walking')).toEqual([])
  expect(routesFromAnswer(undefined, 'foot-walking')).toEqual([])
})

test('tells no route apart from a full quota and a failure', () => {
  expect(outcomeOf(200)).toBe('routes')
  expect(outcomeOf(404)).toBe('no-route')
  expect(outcomeOf(403)).toBe('busy')
  expect(outcomeOf(429)).toBe('busy')
  expect(outcomeOf(500)).toBe('failed')
})
