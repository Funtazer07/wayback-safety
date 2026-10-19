import { beforeEach, expect, test } from 'vitest'
import type { LngLat } from './geometry.ts'
import { clearWalkRoute, loadWalkRoute, saveWalkRoute } from './walkRoute.ts'

// From Stratumseind to the station.
const route: LngLat[] = [
  [5.4791, 51.4385],
  [5.4797, 51.4433],
]

beforeEach(() => {
  localStorage.clear()
})

test('the route belongs to the walk it was saved for', () => {
  saveWalkRoute('walk-1', route)

  expect(loadWalkRoute('walk-1')).toEqual(route)
  expect(loadWalkRoute('walk-2')).toBeNull()
})

test('is gone once it is cleared', () => {
  saveWalkRoute('walk-1', route)

  clearWalkRoute()

  expect(loadWalkRoute('walk-1')).toBeNull()
})

test('broken saved data gives no route instead of an error', () => {
  localStorage.setItem('wayback.walkRoute', '{not json')

  expect(loadWalkRoute('walk-1')).toBeNull()
})
