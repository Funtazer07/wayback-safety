import type { FeatureCollection } from 'geojson'
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import type { BrokenLight } from './brokenLights.ts'
import type { LngLat } from './geometry.ts'
import type { MeasuredRoute } from './lamps.ts'
import { reportCategories } from '../reports/reportCategories.ts'
import type { PlaceReport } from '../reports/reports.ts'
import { loadBrokenLightIcon, loadReportIcons, locationColour, youAreHereIcon } from './mapIcons.ts'
import type { UserPosition } from './useUserPosition.ts'

export const routeHitLayer = 'route-hit'
export const chosenRouteLayer = 'route-chosen'
export const brokenLightsLayer = 'broken-lights'
export const placeReportsLayer = 'place-reports'

// Each category in its own colour, as a MapLibre "match" on the category of the report.
const categoryColour: ExpressionSpecification = [
  'match',
  ['get', 'category'],
  'broken_light',
  reportCategories.broken_light.colour,
  'dark_area',
  reportCategories.dark_area.colour,
  'unsafe',
  reportCategories.unsafe.colour,
  reportCategories.other.colour,
]

// Assumption: a 60 m circle. The spot is rounded to about 110 by 70 m (reports.ts), so the real
// place is somewhere in that area. Pixels per metre double with each zoom step; near Eindhoven one
// pixel is about 97 500 m at zoom 0.
const reportAreaRadius: ExpressionSpecification = [
  'interpolate',
  ['exponential', 2],
  ['zoom'],
  12,
  2.5,
  19,
  322,
]

const routeColour = '#2563eb'
const empty: FeatureCollection = { type: 'FeatureCollection', features: [] }

export type MapData = {
  routes: Pick<MeasuredRoute, 'coordinates'>[]
  selectedIndex: number
  brokenLights: BrokenLight[]
  placeReports: PlaceReport[]
  position: UserPosition | null
}

/** A new base map style removes everything, so this runs after every style change. */
export async function addOurLayers(map: MapLibreMap): Promise<void> {
  const [brokenLight, reportIcons] = await Promise.all([loadBrokenLightIcon(), loadReportIcons()])
  if (!map.hasImage('broken-light')) map.addImage('broken-light', brokenLight, { pixelRatio: 2 })
  for (const [category, image] of reportIcons) {
    if (!map.hasImage(`report-${category}`)) {
      map.addImage(`report-${category}`, image, { pixelRatio: 2 })
    }
  }
  if (!map.hasImage('you-are-here')) {
    map.addImage('you-are-here', youAreHereIcon(map), { pixelRatio: 2 })
  }
  if (map.getSource('routes')) return

  map.addSource('routes', { type: 'geojson', data: empty })
  const rounded = { 'line-cap': 'round', 'line-join': 'round' } as const
  map.addLayer({
    id: 'route-others',
    type: 'line',
    source: 'routes',
    filter: ['!', ['get', 'isSelected']],
    layout: rounded,
    paint: {
      'line-color': '#64748b',
      'line-width': 5,
      'line-opacity': 0.75,
      'line-dasharray': [1, 1.6],
    },
  })
  map.addLayer({
    id: 'route-casing',
    type: 'line',
    source: 'routes',
    filter: ['get', 'isSelected'],
    layout: rounded,
    paint: { 'line-color': '#ffffff', 'line-width': 10 },
  })
  map.addLayer({
    id: chosenRouteLayer,
    type: 'line',
    source: 'routes',
    filter: ['get', 'isSelected'],
    layout: rounded,
    paint: { 'line-color': routeColour, 'line-width': 6 },
  })
  map.addLayer({
    id: routeHitLayer,
    type: 'line',
    source: 'routes',
    filter: ['!', ['get', 'isSelected']],
    paint: { 'line-color': '#000000', 'line-width': 24, 'line-opacity': 0 },
  })

  // Place reports (SCRUM-96): a soft circle for the area and an icon for the category. Under the
  // broken lights, which mark one exact lamp.
  map.addSource('place-reports', { type: 'geojson', data: empty })
  map.addLayer({
    id: 'place-report-areas',
    type: 'circle',
    source: 'place-reports',
    paint: {
      'circle-radius': reportAreaRadius,
      'circle-color': categoryColour,
      'circle-opacity': 0.14,
      'circle-stroke-color': categoryColour,
      'circle-stroke-opacity': 0.45,
      'circle-stroke-width': 1,
    },
  })
  map.addLayer({
    id: placeReportsLayer,
    type: 'symbol',
    source: 'place-reports',
    layout: {
      'icon-image': ['concat', 'report-', ['get', 'category']],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 17, 0.85],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })

  map.addSource('broken-lights', { type: 'geojson', data: empty })
  map.addLayer({
    id: brokenLightsLayer,
    type: 'symbol',
    source: 'broken-lights',
    layout: {
      'icon-image': 'broken-light',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.55, 17, 0.9],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })

  map.addSource('me', { type: 'geojson', data: empty })
  map.addLayer({
    id: 'me-accuracy',
    type: 'fill',
    source: 'me',
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'fill-color': locationColour, 'fill-opacity': 0.12 },
  })
  map.addLayer({
    id: 'me-accuracy-edge',
    type: 'line',
    source: 'me',
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: { 'line-color': locationColour, 'line-opacity': 0.5, 'line-width': 1 },
  })
  map.addLayer({
    id: 'me',
    type: 'symbol',
    source: 'me',
    filter: ['==', ['geometry-type'], 'Point'],
    layout: {
      'icon-image': 'you-are-here',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })
}

// A polygon keeps its real size in metres at every zoom.
function accuracyCircle([longitude, latitude]: LngLat, metres: number): LngLat[] {
  const latitudeRadius = metres / 111320
  const longitudeRadius = metres / (111320 * Math.cos((latitude * Math.PI) / 180))
  return Array.from({ length: 65 }, (_, step) => {
    const angle = (step / 64) * 2 * Math.PI
    return [
      longitude + longitudeRadius * Math.cos(angle),
      latitude + latitudeRadius * Math.sin(angle),
    ]
  })
}

function setData(map: MapLibreMap, source: string, data: FeatureCollection) {
  map.getSource<GeoJSONSource>(source)?.setData(data)
}

export function drawMapData(map: MapLibreMap, data: MapData): void {
  setData(map, 'routes', {
    type: 'FeatureCollection',
    features: data.routes.map((route, index) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: route.coordinates },
      properties: { index, isSelected: index === data.selectedIndex },
    })),
  })
  setData(map, 'place-reports', {
    type: 'FeatureCollection',
    features: data.placeReports.map((report) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: report.coordinates },
      properties: { id: report.id, category: report.category },
    })),
  })
  setData(map, 'broken-lights', {
    type: 'FeatureCollection',
    features: data.brokenLights.map((light) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: light.coordinates },
      properties: { lampId: light.lampId },
    })),
  })
  const position = data.position
  setData(map, 'me', {
    type: 'FeatureCollection',
    features: position
      ? [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [accuracyCircle(position.coordinates, position.accuracy)],
            },
            properties: {},
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: position.coordinates },
            properties: {},
          },
        ]
      : [],
  })
}
