import type { Map as MapLibreMap } from 'maplibre-gl'
import { reportCategories } from '../reports/reportCategories.ts'
import type { ReportCategory } from '../reports/reports.ts'
import { brokenLightsLayer, placeReportsLayer } from './mapLayers.ts'

export type MapReportChoice = { id: string; kind: 'light' | 'place'; label: string }

// A 44 px target remains usable when the visible icon becomes small at lower zoom levels.
const tapRadius = 22

export function mapReportHits(
  map: Pick<MapLibreMap, 'getLayer' | 'queryRenderedFeatures' | 'project'>,
  point: { x: number; y: number },
): MapReportChoice[] {
  const layers = [brokenLightsLayer, placeReportsLayer].filter((id) => map.getLayer(id))
  if (layers.length === 0) return []
  const hits = map.queryRenderedFeatures(
    [
      [point.x - tapRadius, point.y - tapRadius],
      [point.x + tapRadius, point.y + tapRadius],
    ],
    { layers },
  )
  const seen = new Set<string>()
  return hits.flatMap((hit) => {
    if (hit.geometry.type !== 'Point') return []
    const centre = map.project(hit.geometry.coordinates as [number, number])
    if (Math.max(Math.abs(centre.x - point.x), Math.abs(centre.y - point.y)) > tapRadius) return []
    const kind = hit.layer.id === brokenLightsLayer ? 'light' : 'place'
    const id = String(kind === 'light' ? hit.properties.lampId : hit.properties.id)
    const key = `${kind}:${id}`
    if (seen.has(key)) return []
    seen.add(key)
    const category = hit.properties.category as ReportCategory
    const label =
      kind === 'light'
        ? `Broken light${hit.properties.street ? ` · ${hit.properties.street}` : ''}`
        : (reportCategories[category]?.title ?? 'Report')
    return [{ id, kind, label } as MapReportChoice]
  })
}
