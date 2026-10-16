import { expect, test } from 'vitest'
import type { MeasuredRoute } from './lamps.ts'
import { fastestIndex, mostLightsFirst, mostLightsIndex } from './routeChoice.ts'

function route(duration: number, lampsPerKm: number, longestDark = 100): MeasuredRoute {
  return {
    coordinates: [],
    duration,
    length: 1000,
    lampCount: lampsPerKm,
    brokenCount: 0,
    lampsPerKm,
    longestDark,
  }
}

test('finds the fastest route and the one with the most street lights', () => {
  const routes = [route(660, 27), route(840, 79), route(670, 26)]

  expect(fastestIndex(routes)).toBe(0)
  expect(mostLightsIndex(routes)).toBe(1)
})

test('on a tie in lights, the route with the shortest dark piece wins', () => {
  expect(mostLightsIndex([route(600, 40, 300), route(600, 40, 90)])).toBe(1)
})

test('puts the route with the most street lights first', () => {
  const routes = [route(660, 27), route(840, 79)]

  expect(mostLightsFirst(routes).map((each) => each.lampsPerKm)).toEqual([79, 27])
})
