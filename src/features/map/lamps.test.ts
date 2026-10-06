import { expect, test } from 'vitest'
import { lampQueryUrl, parseLamps } from './lamps.ts'

test('asks the municipality for the lamps inside the visible area', () => {
  const url = new URL(lampQueryUrl({ west: 5.46, south: 51.44, east: 5.47, north: 51.45 }))

  expect(url.hostname).toBe('gisservice.eindhoven.nl')
  expect(url.searchParams.get('geometry')).toBe('5.46,51.44,5.47,51.45')
  expect(url.searchParams.get('f')).toBe('geojson')
})

test('turns the service answer into lamps', () => {
  const response = {
    features: [
      {
        geometry: { coordinates: [5.4699, 51.4416] },
        properties: { OBJECTID: 1126, STRAATNAAM: 'Mathildelaan', TYPE_LAMP: 'SON PIA PLUS 150W' },
      },
    ],
  }

  expect(parseLamps(response)).toEqual({
    lamps: [
      {
        id: '1126',
        lat: 51.4416,
        lon: 5.4699,
        street: 'Mathildelaan',
        lampType: 'SON PIA PLUS 150W',
      },
    ],
    isIncomplete: false,
  })
})

test('skips lamps without a position and notices when the answer was cut off', () => {
  const response = {
    features: [{ geometry: {}, properties: { OBJECTID: 1 } }],
    exceededTransferLimit: true,
  }

  expect(parseLamps(response)).toEqual({ lamps: [], isIncomplete: true })
})

test('an unexpected answer gives no lamps instead of an error', () => {
  expect(parseLamps(null)).toEqual({ lamps: [], isIncomplete: false })
})
