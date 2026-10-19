import { expect, test } from 'vitest'
import {
  distanceInMetres,
  isInEindhoven,
  isSameWay,
  lineLength,
  measureFromLine,
  metresFrom,
  placeOf,
  rectanglesAlong,
  type LngLat,
} from './geometry.ts'

// Stratumseind, walking north-west towards the station.
const stratumseind: LngLat = [5.4791, 51.4385]
const north100m: LngLat = [5.4791, 51.4385 + 100 / 110540]

test('measures distances in metres', () => {
  expect(distanceInMetres(stratumseind, north100m)).toBeCloseTo(100, 0)
})

test('knows when a spot is inside Eindhoven', () => {
  expect(isInEindhoven(stratumseind)).toBe(true)
  // Amsterdam
  expect(isInEindhoven([4.9, 52.37])).toBe(false)
})

test('finds how far a point is from a line and how far along it lies', () => {
  const toMetres = metresFrom(stratumseind)
  const line = [stratumseind, north100m].map(toMetres)
  const fiveMetresEast = toMetres([
    5.4791 + 5 / (111320 * Math.cos((51.4385 * Math.PI) / 180)),
    51.4385 + 40 / 110540,
  ])

  const { distance, along } = measureFromLine(line, fiveMetresEast)

  expect(distance).toBeCloseTo(5, 0)
  expect(along).toBeCloseTo(40, 0)
  expect(lineLength(line)).toBeCloseTo(100, 0)
})

test('sees two lines over the same streets as the same way', () => {
  const way: LngLat[] = Array.from({ length: 20 }, (_, step) => [5.4791, 51.4385 + step * 0.0001])
  const otherWay: LngLat[] = way.map(([longitude, latitude]) => [longitude + 0.002, latitude])

  expect(isSameWay(way, way)).toBe(true)
  expect(isSameWay(way, otherWay)).toBe(false)
})

test('a way of a single point is only the same as that very spot', () => {
  expect(isSameWay([stratumseind], [stratumseind])).toBe(true)
  expect(isSameWay([stratumseind], [north100m])).toBe(false)
})

test('covers a long line with one rectangle per piece of about 250 m', () => {
  const kilometre: LngLat[] = Array.from({ length: 11 }, (_, step) => [
    5.4791,
    51.4385 + (step * 100) / 110540,
  ])

  const rectangles = rectanglesAlong(kilometre, 10)

  expect(rectangles).toHaveLength(4)
  for (const point of kilometre) {
    const isCovered = rectangles.some(
      ({ south, west, north, east }) =>
        point[1] >= south && point[1] <= north && point[0] >= west && point[0] <= east,
    )
    expect(isCovered).toBe(true)
  }
})

test('two lamps at the same spot get the same place', () => {
  expect(placeOf([5.47838507, 51.44121199])).toBe(placeOf([5.478385071, 51.441211991]))
})
