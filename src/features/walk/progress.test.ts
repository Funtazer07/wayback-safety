import { expect, test } from 'vitest'
import type { LngLat } from '../map/geometry.ts'
import { hasArrived, metresLeft, suggestedExtension, type Fix } from './progress.ts'

// A straight route along a street in Eindhoven, west to east, about 694 m long. The route planner
// said 600 seconds, so this walker's pace is about 1.16 m/s.
const route: LngLat[] = [
  [5.47, 51.44],
  [5.48, 51.44],
]
const routeSeconds = 600
const now = new Date('2026-10-26T22:20:00')
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000)
const inMinutes = (minutes: number) => new Date(now.getTime() + minutes * 60_000)

function fix(longitude: number, at: Date, accuracy = 10): Fix {
  return { coordinates: [longitude, 51.44], accuracy, at }
}

// Walked from about 70 m to about 210 m along the route in the last 2 minutes: about 485 m left,
// which takes about 7 minutes at this pace.
const onTheWay = [fix(5.471, minutesAgo(2)), fix(5.473, now)]

test('someone walking home who will be late gets a suggestion, rounded up to 5 minutes', () => {
  // Due in 3 minutes, arrives in about 7: about 4 minutes late.
  expect(
    suggestedExtension({ route, routeSeconds, fixes: onTheWay, deadline: inMinutes(3), now }),
  ).toBe(5)
})

test('someone who will be on time gets nothing', () => {
  expect(
    suggestedExtension({ route, routeSeconds, fixes: onTheWay, deadline: inMinutes(10), now }),
  ).toBeNull()
})

test('someone who stopped gets nothing: they may need help, so "Are you okay?" takes over', () => {
  const stopped = [fix(5.473, minutesAgo(2)), fix(5.473, now)]

  expect(
    suggestedExtension({ route, routeSeconds, fixes: stopped, deadline: inMinutes(1), now }),
  ).toBeNull()
})

test('someone walking away from home gets nothing', () => {
  const away = [fix(5.473, minutesAgo(2)), fix(5.471, now)]

  expect(
    suggestedExtension({ route, routeSeconds, fixes: away, deadline: inMinutes(1), now }),
  ).toBeNull()
})

test('vague or old positions are not used', () => {
  const vague = [fix(5.471, minutesAgo(2), 200), fix(5.473, now, 200)]
  const old = [fix(5.471, minutesAgo(12)), fix(5.473, minutesAgo(10))]

  expect(
    suggestedExtension({ route, routeSeconds, fixes: vague, deadline: inMinutes(3), now }),
  ).toBeNull()
  expect(
    suggestedExtension({ route, routeSeconds, fixes: old, deadline: inMinutes(3), now }),
  ).toBeNull()
})

test('without a route or after the deadline there is nothing to suggest', () => {
  expect(
    suggestedExtension({ route: null, routeSeconds, fixes: onTheWay, deadline: inMinutes(3), now }),
  ).toBeNull()
  expect(
    suggestedExtension({ route, routeSeconds, fixes: onTheWay, deadline: minutesAgo(1), now }),
  ).toBeNull()
})

test('a very late walker is offered at most 30 minutes', () => {
  // A very slow pace: the route takes an hour.
  expect(
    suggestedExtension({
      route,
      routeSeconds: 3600,
      fixes: onTheWay,
      deadline: inMinutes(1),
      now,
    }),
  ).toBe(30)
})

test('off the route, the distance left is a straight line, made a bit longer', () => {
  // About 300 m north of the route's end.
  const straight = metresLeft(route, [5.48, 51.4427])
  expect(straight).toBeGreaterThan(300 * 1.25)
  expect(straight).toBeLessThan(300 * 1.35)
})

test('at the end of the route the walker counts as arrived', () => {
  expect(hasArrived(route, [fix(5.4797, now)], now)).toBe(true)
  // About 100 m before the end.
  expect(hasArrived(route, [fix(5.4785, now)], now)).toBe(false)
  // Too vague to tell.
  expect(hasArrived(route, [fix(5.4797, now, 120)], now)).toBe(false)
  expect(hasArrived(null, [fix(5.4797, now)], now)).toBe(false)
})
