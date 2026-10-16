import { beforeEach, expect, test } from 'vitest'
import {
  brokenLightFrom,
  isReportedBroken,
  loadBrokenLights,
  saveBrokenLights,
} from './brokenLights.ts'
import type { Lamp } from './lamps.ts'

const vestdijk: Lamp = {
  lampId: '776',
  coordinates: [5.478385, 51.441212],
  street: 'Vestdijk',
  number: '002',
}

beforeEach(() => {
  localStorage.clear()
})

test('a report is there again after the page is reloaded', () => {
  const report = brokenLightFrom(vestdijk, new Date('2026-10-16T22:30:00Z'))

  saveBrokenLights([report])

  expect(loadBrokenLights()).toEqual([
    {
      lampId: '776',
      coordinates: [5.478385, 51.441212],
      street: 'Vestdijk',
      reportedAt: '2026-10-16T22:30:00.000Z',
    },
  ])
})

test('starts empty when nothing is saved or the saved data is broken', () => {
  expect(loadBrokenLights()).toEqual([])

  localStorage.setItem('wayback.brokenLights', '{not json')
  expect(loadBrokenLights()).toEqual([])

  localStorage.setItem('wayback.brokenLights', JSON.stringify([{ lampId: 1 }]))
  expect(loadBrokenLights()).toEqual([])
})

test('knows when a street light is already reported', () => {
  const reports = [brokenLightFrom(vestdijk, new Date())]

  expect(isReportedBroken(vestdijk, reports)).toBe(true)
  expect(isReportedBroken({ ...vestdijk, coordinates: [5.479, 51.44] }, reports)).toBe(false)
})
