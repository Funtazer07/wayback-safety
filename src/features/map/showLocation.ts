import L from 'leaflet'

const locationColour = '#00a85a'

/**
 * Draws the user's position each time map.locate() finds it. The position is only drawn, never
 * stored or sent anywhere. Returns a function that removes the layer again.
 */
export function showLocation(
  map: L.Map,
  cityBounds: L.LatLngBounds,
  onStatus: (status: string) => void,
): () => void {
  const layer = L.layerGroup().addTo(map)

  function onFound(event: L.LocationEvent) {
    layer.clearLayers()
    L.circle(event.latlng, {
      radius: event.accuracy,
      weight: 1,
      color: locationColour,
      fillOpacity: 0.15,
    }).addTo(layer)
    L.circleMarker(event.latlng, {
      radius: 8,
      weight: 3,
      color: '#ffffff',
      fillColor: locationColour,
      fillOpacity: 1,
    })
      .bindPopup('You are here')
      .addTo(layer)

    onStatus(
      cityBounds.contains(event.latlng)
        ? ''
        : 'You are outside Eindhoven. The map only covers the city.',
    )
  }

  function onError() {
    onStatus('Could not find your location. Allow location access and try again.')
  }

  map.on('locationfound', onFound)
  map.on('locationerror', onError)

  return () => {
    map.off('locationfound', onFound)
    map.off('locationerror', onError)
    map.stopLocate()
    layer.remove()
  }
}
