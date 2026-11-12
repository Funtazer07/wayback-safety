import { afterEach, expect, test } from 'vitest'
import { clearHome, loadHome, saveHome } from './savedHome.ts'

const home = {
  label: 'Kruisstraat 12, 5612CJ Eindhoven',
  coordinates: [5.4752, 51.4466] as [number, number],
}

afterEach(() => {
  localStorage.clear()
})

test('a saved home is there again the next time the app opens', () => {
  saveHome(home)

  expect(loadHome()).toEqual(home)
})

test('without a saved home there is nothing to load', () => {
  expect(loadHome()).toBeNull()
})

test('a home can be removed again', () => {
  saveHome(home)
  clearHome()

  expect(loadHome()).toBeNull()
})

test('a damaged saved home is ignored instead of breaking the map', () => {
  localStorage.setItem('wayback.home', '{"label":"Home","coordinates":["x"]}')
  expect(loadHome()).toBeNull()

  localStorage.setItem('wayback.home', 'not json')
  expect(loadHome()).toBeNull()
})
