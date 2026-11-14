import { expect, test } from 'vitest'
import { brokenColour } from '../map/mapIcons.ts'
import { categoryOrder, reportCategories } from './reportCategories.ts'

test('every category has its own colour on the map', () => {
  const colours = categoryOrder.map((category) => reportCategories[category].colour)

  expect(new Set(colours).size).toBe(categoryOrder.length)
})

test('a broken light looks the same whether it was reported with the form or on the map', () => {
  expect(reportCategories.broken_light.colour).toBe(brokenColour)
})
