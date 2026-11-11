import { expect, test } from 'vitest'
import type { PlaceReport } from '../reports/reports.ts'
import type { MeasuredRoute } from './lamps.ts'
import { reportsAlongRoutes } from './routeReports.ts'

const route = (latitude: number, length = 1000): MeasuredRoute => ({
  coordinates: [
    [5.46, latitude],
    [5.48, latitude],
  ],
  duration: 600,
  length,
  lampCount: 20,
  brokenCount: 0,
  lampsPerKm: 20,
  longestDark: 80,
})
const report = (
  category: PlaceReport['category'],
  latitude: number,
  longitude = 5.47,
): PlaceReport => ({
  id: `${category}-${latitude}-${longitude}`,
  category,
  coordinates: [longitude, latitude],
  reportedAt: new Date(),
})

test('reports near the middle of a route count, but distant reports do not', () => {
  const [result] = reportsAlongRoutes(
    [route(51.44)],
    [report('quiet', 51.4405), report('unsafe', 51.45)],
  )
  expect(result.quietLabel).toBe('Quiet')
  expect(result.unsafeCount).toBe(0)
})

test('a route without reports is never labelled quiet or safe', () => {
  const [result] = reportsAlongRoutes([route(51.44)], [])
  expect(result.quietLabel).toBeUndefined()
  expect(result.unsafeCount).toBe(0)
})

test('more quiet compares quiet-report density, without treating unreported routes as busy', () => {
  const results = reportsAlongRoutes(
    [route(51.44, 500), route(51.45, 1000), route(51.46)],
    [report('quiet', 51.44), report('quiet', 51.45)],
  )
  expect(results.map((result) => result.quietLabel)).toEqual(['More quiet', 'Quiet', undefined])
})

test('one reported quiet route is not ranked against unreported routes', () => {
  const results = reportsAlongRoutes([route(51.44), route(51.45)], [report('quiet', 51.44)])
  expect(results.map((result) => result.quietLabel)).toEqual(['Quiet', undefined])
})

test('darkness, hazards and unsafe reports keep their separate meanings', () => {
  const [result] = reportsAlongRoutes(
    [route(51.44)],
    ['dark_area', 'unsafe', 'other', 'broken_light'].map((category) =>
      report(category as PlaceReport['category'], 51.44),
    ),
  )
  expect(result).toMatchObject({ darkCount: 1, unsafeCount: 1, otherCount: 1, brokenCount: 1 })
  expect(result.quietLabel).toBeUndefined()
})

test('an empty route has no nearby report labels', () => {
  const empty = { ...route(51.44), coordinates: [] }
  expect(reportsAlongRoutes([empty], [report('quiet', 51.44)])[0].quietLabel).toBeUndefined()
})

test('an exact broken lamp on a neighbouring street does not label the route', () => {
  const [result] = reportsAlongRoutes(
    [route(51.44)],
    [],
    [
      {
        lampId: 'near',
        coordinates: [5.47, 51.4405],
        street: 'Vestdijk',
        reportedAt: new Date().toISOString(),
      },
      {
        lampId: 'far',
        coordinates: [5.47, 51.45],
        street: 'Other',
        reportedAt: new Date().toISOString(),
      },
    ],
  )
  expect(result.brokenCount).toBe(0)
})

test('an exact broken lamp on the path still labels the route', () => {
  const [result] = reportsAlongRoutes(
    [route(51.44)],
    [],
    [
      {
        lampId: 'on-path',
        coordinates: [5.47, 51.44],
        street: 'Vestdijk',
        reportedAt: new Date().toISOString(),
      },
    ],
  )
  expect(result.brokenCount).toBe(1)
})
