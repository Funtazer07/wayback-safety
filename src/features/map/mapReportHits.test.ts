import type { Map as MapLibreMap, MapGeoJSONFeature } from 'maplibre-gl'
import { expect, test, vi } from 'vitest'
import { mapReportHits } from './mapReportHits.ts'
import { brokenLightsLayer, placeReportsLayer } from './mapLayers.ts'

function feature(layer: string, x: number, properties: Record<string, string>): MapGeoJSONFeature {
  return {
    layer: { id: layer },
    geometry: { type: 'Point', coordinates: [x, 100] },
    properties,
  } as MapGeoJSONFeature
}
function fakeMap(hits: MapGeoJSONFeature[]) {
  return {
    getLayer: vi.fn(() => ({})),
    queryRenderedFeatures: vi.fn(() => hits),
    project: vi.fn(([x, y]: [number, number]) => ({ x, y })),
  } as unknown as Pick<MapLibreMap, 'getLayer' | 'queryRenderedFeatures' | 'project'>
}

test('a small marker is selectable inside a 44 pixel target, without selecting distant markers', () => {
  const map = fakeMap([
    feature(brokenLightsLayer, 118, { lampId: 'near', street: 'Vestdijk' }),
    feature(brokenLightsLayer, 140, { lampId: 'outside' }),
  ])
  expect(mapReportHits(map, { x: 100, y: 100 })).toEqual([
    { id: 'near', kind: 'light', label: 'Broken light · Vestdijk' },
  ])
  expect(map.queryRenderedFeatures).toHaveBeenCalledWith(
    [
      [78, 78],
      [122, 122],
    ],
    { layers: [brokenLightsLayer, placeReportsLayer] },
  )
})

test('overlapping report types all remain selectable and duplicated map features are removed', () => {
  const lamp = feature(brokenLightsLayer, 100, { lampId: 'same' })
  const place = feature(placeReportsLayer, 100, { id: 'same', category: 'unsafe' })
  const hits = mapReportHits(fakeMap([lamp, place, lamp]), { x: 100, y: 100 })
  expect(hits).toHaveLength(2)
  expect(hits.map(({ kind }) => kind)).toEqual(['light', 'place'])
})

test('reports do not intercept route taps when report layers are not ready', () => {
  const map = fakeMap([])
  vi.mocked(map.getLayer).mockReturnValue(undefined)
  expect(mapReportHits(map, { x: 100, y: 100 })).toEqual([])
  expect(map.queryRenderedFeatures).not.toHaveBeenCalled()
})
