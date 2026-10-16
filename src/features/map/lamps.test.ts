import { expect, test } from 'vitest'
import type { LngLat } from './geometry.ts'
import { describeLamp, lampsInUrl, measureRoute, nearestLamp } from './lamps.ts'

// A straight walk of 200 m due north from Stratumseind.
const metresNorth = (metres: number) => metres / 110540
const metresEast = (metres: number) => metres / (111320 * Math.cos((51.4385 * Math.PI) / 180))
const start: LngLat = [5.4791, 51.4385]
const route = {
  coordinates: [start, [5.4791, 51.4385 + metresNorth(200)]] as LngLat[],
  duration: 150,
}

function lampAt(eastMetres: number, northMetres: number, properties = {}) {
  return {
    geometry: {
      coordinates: [5.4791 + metresEast(eastMetres), 51.4385 + metresNorth(northMetres)],
    },
    properties,
  }
}

test('counts only street lights within 5 m of the route', () => {
  const answer = { features: [lampAt(3, 50), lampAt(-4, 100), lampAt(12, 150)] }

  const measured = measureRoute(route, answer, new Set())

  expect(measured.lampCount).toBe(2)
  expect(measured.lampsPerKm).toBeCloseTo(10, 0)
})

test('counts two lamps at the same spot once', () => {
  const answer = { features: [lampAt(2, 50), lampAt(2, 50)] }

  expect(measureRoute(route, answer, new Set()).lampCount).toBe(1)
})

test('finds the longest piece without a street light, also at the start and the end', () => {
  const answer = { features: [lampAt(0, 20), lampAt(0, 60)] }

  expect(measureRoute(route, answer, new Set()).longestDark).toBeCloseTo(140, 0)
})

test('a light reported as broken does not count, but is told apart', () => {
  const broken = lampAt(0, 100)
  const answer = { features: [lampAt(0, 50), broken, lampAt(0, 150)] }
  const brokenPlace = new Set([
    `${broken.geometry.coordinates[0].toFixed(6)},${broken.geometry.coordinates[1].toFixed(6)}`,
  ])

  const measured = measureRoute(route, answer, brokenPlace)

  expect(measured.lampCount).toBe(2)
  expect(measured.brokenCount).toBe(1)
  expect(measured.longestDark).toBeCloseTo(100, 0)
})

test('finds the street light nearest to a long press', () => {
  const answer = {
    features: [
      lampAt(20, 0, { objectid: 776, straatnaam: 'Vestdijk', identificatie: '002' }),
      lampAt(8, 0, { objectid: 777, straatnaam: 'Vestdijk', identificatie: '003' }),
    ],
  }

  const lamp = nearestLamp(start, answer)

  expect(lamp).toMatchObject({ lampId: '777', street: 'Vestdijk', number: '003' })
  expect(lamp && describeLamp(lamp)).toBe('Vestdijk, number 003')
})

test('finds no street light when the nearest one is more than 30 m away', () => {
  expect(nearestLamp(start, { features: [lampAt(45, 0)] })).toBeNull()
  expect(nearestLamp(start, null)).toBeNull()
})

test('asks the open data portal for the lamps inside rectangles', () => {
  const url = new URL(
    lampsInUrl([{ south: 51.43, west: 5.47, north: 51.44, east: 5.48 }], 'geo_point_2d'),
  )

  expect(url.hostname).toBe('data.eindhoven.nl')
  expect(url.searchParams.get('where')).toBe(
    'in_bbox(geo_point_2d, 51.430000, 5.470000, 51.440000, 5.480000)',
  )
})
