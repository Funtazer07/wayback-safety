export type Lamp = {
  id: string
  lat: number
  lon: number
  street: string
  lampType: string
}

export type Bounds = {
  west: number
  south: number
  east: number
  north: number
}

/** Below this zoom level a screen holds too many lamps to load and show. */
export const minLampZoom = 15

// The Municipality of Eindhoven's register of street lights (openbare verlichting). It says where a
// lamp stands, not whether it is on.
const lampServiceUrl =
  'https://gisservice.eindhoven.nl/arcgis/rest/services/ODS_OVL/MapServer/0/query'

/** The service returns at most this many lamps per request. */
const maxLampsPerRequest = 1000

export function lampQueryUrl({ west, south, east, north }: Bounds): string {
  const params = new URLSearchParams({
    where: 'X IS NOT NULL AND Y IS NOT NULL',
    outFields: 'OBJECTID,STRAATNAAM,TYPE_LAMP',
    geometry: `${west},${south},${east},${north}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: String(maxLampsPerRequest),
  })
  return `${lampServiceUrl}?${params}`
}

type LampFeature = {
  geometry?: { coordinates?: unknown }
  properties?: { OBJECTID?: unknown; STRAATNAAM?: unknown; TYPE_LAMP?: unknown }
}

type LampResponse = {
  features?: LampFeature[]
  exceededTransferLimit?: boolean
}

export type LampResult = {
  lamps: Lamp[]
  /** True when the area holds more lamps than one request returns. */
  isIncomplete: boolean
}

export function parseLamps(response: unknown): LampResult {
  const { features = [], exceededTransferLimit = false } = (response ?? {}) as LampResponse
  const lamps: Lamp[] = []

  for (const feature of features) {
    const coordinates = feature.geometry?.coordinates
    const properties = feature.properties ?? {}
    if (!Array.isArray(coordinates) || properties.OBJECTID === undefined) continue

    const [lon, lat] = coordinates
    if (typeof lat !== 'number' || typeof lon !== 'number') continue

    lamps.push({
      id: String(properties.OBJECTID),
      lat,
      lon,
      street: typeof properties.STRAATNAAM === 'string' ? properties.STRAATNAAM : '',
      lampType: typeof properties.TYPE_LAMP === 'string' ? properties.TYPE_LAMP : '',
    })
  }

  return { lamps, isIncomplete: exceededTransferLimit }
}
