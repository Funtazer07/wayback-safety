import { expect, test } from 'vitest'
import { isAfterDusk, sunElevation, withDarkStretchesAfterDusk } from './daylight.ts'
import { eindhovenCentre } from './geometry.ts'
import type { MeasuredRoute } from './lamps.ts'

test('the sun stands about 19 degrees high at noon in Eindhoven in November', () => {
  expect(sunElevation(new Date('2026-11-17T11:00Z'), eindhovenCentre)).toBeCloseTo(19.3, 0)
})

test('it is after dusk between sunset and sunrise, in winter and in summer', () => {
  // 17 November: sunset about 16:47, sunrise about 8:10 (Dutch time, UTC+1).
  expect(isAfterDusk(new Date('2026-11-17T15:30Z'))).toBe(false)
  expect(isAfterDusk(new Date('2026-11-17T16:00Z'))).toBe(true)
  expect(isAfterDusk(new Date('2026-11-17T23:00Z'))).toBe(true)
  expect(isAfterDusk(new Date('2026-11-18T07:30Z'))).toBe(false)
  // 21 June: sunset about 22:05 (summer time, UTC+2).
  expect(isAfterDusk(new Date('2026-06-21T19:30Z'))).toBe(false)
  expect(isAfterDusk(new Date('2026-06-21T20:30Z'))).toBe(true)
})

test('by day the dark stretches are left out, but the lights are still counted', () => {
  const route = {
    coordinates: [],
    duration: 600,
    length: 1000,
    lampCount: 20,
    brokenCount: 1,
    lampsPerKm: 20,
    longestDark: 80,
    darkStretches: [{ length: 80, coordinates: [] }],
  } satisfies MeasuredRoute

  const [byDay] = withDarkStretchesAfterDusk([route], false)
  const [atNight] = withDarkStretchesAfterDusk([route], true)

  expect(byDay).toMatchObject({ lampCount: 20, brokenCount: 1, darkStretches: [] })
  expect(atNight.darkStretches).toHaveLength(1)
})
