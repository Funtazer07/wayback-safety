import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { showLamps } from './showLamps.ts'
import { showLocation } from './showLocation.ts'

type MapViewProps = {
  /** Keeps the user's position up to date and centres the map on it once found. */
  followsUser?: boolean
}

const eindhovenCentre: L.LatLngTuple = [51.4416, 5.4697]
const eindhovenBounds = L.latLngBounds([51.35, 5.35], [51.53, 5.6])

/** The map of Eindhoven with the street lights and the user's position. */
function MapView({ followsUser = false }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const lastPositionRef = useRef<L.LatLng | null>(null)
  const [lampStatus, setLampStatus] = useState('')
  const [locationStatus, setLocationStatus] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = L.map(container, {
      center: eindhovenCentre,
      zoom: 16,
      minZoom: 12,
      maxBounds: eindhovenBounds,
      maxBoundsViscosity: 1,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    const stopLamps = showLamps(map, setLampStatus)
    const stopLocation = showLocation(map, eindhovenBounds, setLocationStatus)
    mapRef.current = map

    // The map's box changes size when the page layout changes; Leaflet only notices window resizes.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize())
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      stopLamps()
      stopLocation()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!followsUser || !map) return

    // Centre on the user only the first time, so they can still look around the map while walking.
    function onFound(event: L.LocationEvent) {
      if (!lastPositionRef.current) map?.setView(event.latlng, 17)
      lastPositionRef.current = event.latlng
    }

    map.on('locationfound', onFound)
    map.locate({ watch: true, enableHighAccuracy: true })
    return () => {
      map.off('locationfound', onFound)
      map.stopLocate()
      lastPositionRef.current = null
    }
  }, [followsUser])

  function locate() {
    const map = mapRef.current
    // While following, the position is already being watched: jump back to it.
    if (followsUser && lastPositionRef.current) {
      map?.setView(lastPositionRef.current, 17)
      return
    }
    setLocationStatus('Finding your location…')
    map?.locate({ setView: true, maxZoom: 17, enableHighAccuracy: true })
  }

  const status = [locationStatus, lampStatus].filter(Boolean).join(' ')

  return (
    <div className="map-view">
      <div ref={containerRef} className="map-canvas" />
      <button type="button" className="map-locate" onClick={locate}>
        My location
      </button>
      <p className="map-status" role="status">
        {status}
      </p>
    </div>
  )
}

export default MapView
