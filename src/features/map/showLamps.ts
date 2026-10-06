import L from 'leaflet'
import { lampQueryUrl, minLampZoom, parseLamps } from './lamps.ts'
import { popupContent } from './popupContent.ts'

const lampColour = '#2b8cbe'

/**
 * Loads the street lights in view every time the map stops moving. Returns a function that removes
 * the layer again.
 */
export function showLamps(map: L.Map, onStatus: (status: string) => void): () => void {
  const layer = L.layerGroup().addTo(map)
  const shownIds = new Set<string>()
  let controller: AbortController | undefined

  async function load() {
    // Only the latest view matters: stop a request that is still running for an older one.
    controller?.abort()

    if (map.getZoom() < minLampZoom) {
      layer.clearLayers()
      shownIds.clear()
      onStatus('Zoom in to see street lights.')
      return
    }

    controller = new AbortController()
    const { signal } = controller
    const bounds = map.getBounds()
    onStatus('Loading street lights…')

    try {
      const response = await fetch(
        lampQueryUrl({
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        }),
        { signal },
      )
      if (!response.ok) throw new Error(`Lamp service answered ${response.status}`)
      const { lamps, isIncomplete } = parseLamps(await response.json())

      for (const lamp of lamps) {
        if (shownIds.has(lamp.id)) continue
        shownIds.add(lamp.id)
        L.circleMarker([lamp.lat, lamp.lon], {
          radius: 4,
          weight: 1,
          color: '#0f172a',
          fillColor: lampColour,
          fillOpacity: 0.85,
        })
          .bindPopup(popupContent('Street light', [lamp.street, lamp.lampType]))
          .addTo(layer)
      }
      onStatus(isIncomplete ? 'Zoom in further to see all street lights here.' : '')
    } catch {
      if (signal.aborted) return
      onStatus('Could not load street lights. Check your connection.')
    }
  }

  map.on('moveend', load)
  void load()

  return () => {
    controller?.abort()
    map.off('moveend', load)
    layer.remove()
  }
}
