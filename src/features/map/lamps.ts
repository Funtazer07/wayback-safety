import { fetchJson } from './fetchJson.ts'
import {
  distanceInMetres,
  lineLength,
  measureFromLine,
  metresFrom,
  placeOf,
  rectangleAround,
  rectanglesAlong,
  type LngLat,
  type Rectangle,
} from './geometry.ts'
import type { Route } from './routes.ts'

// The municipality's open data portal, dataset "data-openbare-verlichting" (named in SCRUM-26). It
// is a register: it says where a lamp stands, not whether it is on.
const lampExportUrl =
  'https://data.eindhoven.nl/api/explore/v2.1/catalog/datasets/data-openbare-verlichting/exports/geojson'

// Assumption: a lamp lights the route when it stands within 5 m of it. A wider reach also counted
// lamps on a busy road running next to the walking route. With 3 m most lamps on normal streets
// dropped out, because a route often follows the middle of the road.
export const lampReach = 5
// Assumption: a press within 30 m of a street light is meant for that light. The user cannot see
// the lamps, so the press has to be forgiving.
export const reportReach = 30

/** One registered street light. */
export type Lamp = {
  lampId: string
  coordinates: LngLat
  street: string
  /** The number of the lamp post in the register, as printed on the post. */
  number: string
}

/** A route with what the register says about the street lights along it. */
export type MeasuredRoute = Route & {
  /** Length in metres. */
  length: number
  /** Street lights along the route that nobody reported as broken. */
  lampCount: number
  brokenCount: number
  lampsPerKm: number
  /** The longest piece of the route without a working street light, in metres. */
  longestDark: number
}

type LampFeature = {
  geometry?: { coordinates?: unknown }
  properties?: { objectid?: unknown; straatnaam?: unknown; identificatie?: unknown }
}

function featuresOf(answer: unknown): LampFeature[] {
  const features = (answer as { features?: unknown } | null)?.features
  return Array.isArray(features) ? features : []
}

function coordinatesOf(feature: LampFeature): LngLat | null {
  const coordinates = feature.geometry?.coordinates
  if (!Array.isArray(coordinates)) return null
  const [longitude, latitude] = coordinates
  return typeof longitude === 'number' && typeof latitude === 'number'
    ? [longitude, latitude]
    : null
}

function inRectangle({ south, west, north, east }: Rectangle): string {
  const values = [south, west, north, east].map((value) => value.toFixed(6))
  return `in_bbox(geo_point_2d, ${values.join(', ')})`
}

export function lampsInUrl(rectangles: Rectangle[], fields: string): string {
  const params = new URLSearchParams({
    where: rectangles.map(inRectangle).join(' OR '),
    select: fields,
  })
  return `${lampExportUrl}?${params}`
}

/** Counts the street lights along a route, leaving out the spots that are reported broken. */
export function measureRoute(
  route: Route,
  answer: unknown,
  brokenPlaces: Set<string>,
): MeasuredRoute {
  const toMetres = metresFrom(route.coordinates[0])
  const routeInMetres = route.coordinates.map(toMetres)
  const working = new Map<string, number>()
  const broken = new Set<string>()

  for (const feature of featuresOf(answer)) {
    const coordinates = coordinatesOf(feature)
    if (!coordinates) continue
    const place = placeOf(coordinates)
    if (working.has(place) || broken.has(place)) continue

    // The rectangles are rough: only lamps really within reach of the route count.
    const { distance, along } = measureFromLine(routeInMetres, toMetres(coordinates))
    if (distance > lampReach) continue

    // A light reported as broken gives no light, so it does not count for the route.
    if (brokenPlaces.has(place)) broken.add(place)
    else working.set(place, along)
  }

  const length = lineLength(routeInMetres)
  const spots = [0, ...[...working.values()].sort((first, second) => first - second), length]
  let longestDark = 0
  for (let index = 1; index < spots.length; index++) {
    longestDark = Math.max(longestDark, spots[index] - spots[index - 1])
  }

  return {
    ...route,
    length,
    lampCount: working.size,
    brokenCount: broken.size,
    lampsPerKm: length > 0 ? working.size / (length / 1000) : 0,
    longestDark,
  }
}

export async function measureRouteLamps(
  route: Route,
  brokenPlaces: Set<string>,
  signal: AbortSignal,
): Promise<MeasuredRoute> {
  const url = lampsInUrl(rectanglesAlong(route.coordinates, lampReach + 5), 'geo_point_2d')
  return measureRoute(route, await fetchJson(url, signal), brokenPlaces)
}

/** The registered street light nearest to a spot, or null when none is within reach. */
export function nearestLamp(point: LngLat, answer: unknown): Lamp | null {
  let nearest: { lamp: Lamp; distance: number } | null = null
  for (const feature of featuresOf(answer)) {
    const coordinates = coordinatesOf(feature)
    if (!coordinates) continue
    const distance = distanceInMetres(point, coordinates)
    if (distance > reportReach || (nearest && distance >= nearest.distance)) continue
    const properties = feature.properties ?? {}
    nearest = {
      distance,
      lamp: {
        lampId: String(properties.objectid ?? ''),
        coordinates,
        street: typeof properties.straatnaam === 'string' ? properties.straatnaam : '',
        number: typeof properties.identificatie === 'string' ? properties.identificatie : '',
      },
    }
  }
  return nearest?.lamp ?? null
}

export async function findLampNear(point: LngLat): Promise<Lamp | null> {
  const url = lampsInUrl(
    [rectangleAround(point, reportReach)],
    'objectid,straatnaam,identificatie,geo_point_2d',
  )
  return nearestLamp(point, await fetchJson(url))
}

export function describeLamp(lamp: Lamp): string {
  if (!lamp.street) return 'The nearest street light'
  return lamp.number ? `${lamp.street}, number ${lamp.number}` : lamp.street
}
