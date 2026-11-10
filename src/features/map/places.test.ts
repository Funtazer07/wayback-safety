import { beforeEach, expect, test, vi } from 'vitest'
import { searchPlaces, toPlace } from './places.ts'

const { fetchJson } = vi.hoisted(() => ({ fetchJson: vi.fn() }))

vi.mock('./fetchJson.ts', () => ({ fetchJson }))

beforeEach(() => {
  fetchJson.mockReset()
})

test('a place gets its spot from the text PDOK sends, longitude first', () => {
  expect(
    toPlace({
      id: 'adr-1',
      weergavenaam: 'Stratumseind 32, 5611ET Eindhoven',
      centroide_ll: 'POINT(5.4813819 51.43644042)',
    }),
  ).toEqual({
    id: 'adr-1',
    label: 'Stratumseind 32, 5611ET Eindhoven',
    coordinates: [5.4813819, 51.43644042],
  })
})

test('a place without a usable spot is left out', async () => {
  fetchJson.mockResolvedValue({
    response: {
      docs: [
        {
          id: 'weg-1',
          weergavenaam: 'Kruisstraat, Eindhoven',
          centroide_ll: 'POINT(5.4753 51.448)',
        },
        { id: 'weg-2', weergavenaam: 'Somewhere', centroide_ll: '' },
      ],
    },
  })

  const places = await searchPlaces('kruisstr')

  expect(places.map((place) => place.label)).toEqual(['Kruisstraat, Eindhoven'])
})

test('the search asks only for addresses, streets and postcodes in Eindhoven', async () => {
  fetchJson.mockResolvedValue({ response: { docs: [] } })

  await searchPlaces('Stratumseind 32')

  const url = new URL(fetchJson.mock.calls[0][0] as string)
  expect(url.searchParams.get('q')).toBe('Stratumseind 32')
  expect(url.searchParams.getAll('fq')).toEqual([
    'gemeentenaam:Eindhoven',
    'type:(adres OR weg OR postcode)',
  ])
})

test('the search fails when the service does not answer', async () => {
  const error = new Error('timeout')
  fetchJson.mockRejectedValue(error)

  await expect(searchPlaces('Vestdijk')).rejects.toBe(error)
})
