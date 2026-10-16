import maplibregl from 'maplibre-gl'
import type { LngLat } from './geometry.ts'

type Padding = { top: number; bottom: number; left: number; right: number }

/**
 * Where the map should look. A new `id` asks for a new move, also to the same place, so pressing
 * "My location" twice works twice.
 */
export type CameraMove =
  | { id: number; kind: 'centre'; centre: LngLat; zoom: number }
  | { id: number; kind: 'fit'; coordinates: LngLat[]; padding: Padding }

/** Panels cover part of the map. The room they take is kept free, as long as the map is big enough. */
function paddingThatFits(map: maplibregl.Map, padding: Padding): Padding {
  const { clientWidth: width, clientHeight: height } = map.getContainer()
  const scaleBy = (size: number, first: number, second: number) => {
    const room = size - 80
    return first + second > room ? room / (first + second) : 1
  }
  const vertical = scaleBy(height, padding.top, padding.bottom)
  const horizontal = scaleBy(width, padding.left, padding.right)
  return {
    top: padding.top * vertical,
    bottom: padding.bottom * vertical,
    left: padding.left * horizontal,
    right: padding.right * horizontal,
  }
}

export function moveCamera(map: maplibregl.Map, move: CameraMove): void {
  if (move.kind === 'centre') {
    map.flyTo({ center: move.centre, zoom: move.zoom })
    return
  }
  if (move.coordinates.length === 0) return
  const bounds = new maplibregl.LngLatBounds()
  for (const point of move.coordinates) bounds.extend(point)
  map.fitBounds(bounds, { padding: paddingThatFits(map, move.padding), maxZoom: 17 })
}
