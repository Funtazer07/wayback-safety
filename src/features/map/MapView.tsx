import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import { eindhovenBounds, eindhovenCentre, type LngLat } from './geometry.ts'
import { watchHold } from './holdGesture.ts'
import {
  addOurLayers,
  brokenLightsLayer,
  chosenRouteLayer,
  drawMapData,
  routeHitLayer,
  type MapData,
} from './mapLayers.ts'
import {
  destinationMarker,
  foundLampMarker,
  lastLocationMarker,
  startMarker,
} from './mapMarkers.ts'
import { mapStyle } from './mapStyles.ts'
import { moveCamera, type CameraMove } from './moveCamera.ts'

type MapViewProps = Partial<Pick<MapData, 'routes' | 'selectedIndex'>> &
  Pick<MapData, 'brokenLights' | 'position'> & {
    start?: LngLat | null
    destination?: LngLat | null
    /** The street light about to be reported, marked with a ring. */
    foundLamp?: LngLat | null
    /** Where a walker was last seen, for a contact after a missed check-in (SCRUM-102). */
    lastLocation?: LngLat | null
    camera?: CameraMove | null
    onTap?: (point: LngLat) => void
    onHold: (point: LngLat) => void
    onSelectRoute?: (index: number) => void
    onBrokenLightTap: (lampId: string) => void
  }

/** The MapLibre map. React hands it the data; this component puts it on the map. */
function MapView(props: MapViewProps) {
  const { start, destination, foundLamp, lastLocation, camera } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<{
    start: maplibregl.Marker
    destination: maplibregl.Marker
    lamp: maplibregl.Marker
    last: maplibregl.Marker
  } | null>(null)

  const data: MapData = {
    routes: props.routes ?? [],
    selectedIndex: props.selectedIndex ?? 0,
    brokenLights: props.brokenLights,
    position: props.position,
  }
  // MapLibre keeps the handlers from when the map was made. Through these refs they see the
  // latest props and data.
  const latest = useRef(props)
  const dataRef = useRef(data)
  useEffect(() => {
    latest.current = props
    dataRef.current = data
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = new maplibregl.Map({
      container,
      style: mapStyle,
      center: eindhovenCentre,
      zoom: 15,
      minZoom: 12,
      maxZoom: 19,
      maxBounds: eindhovenBounds,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    markersRef.current = {
      start: startMarker(),
      destination: destinationMarker(),
      lamp: foundLampMarker(),
      last: lastLocationMarker(),
    }

    map.on('style.load', async () => {
      await addOurLayers(map)
      drawMapData(map, dataRef.current)
    })

    const hold = watchHold(map, (point) => latest.current.onHold(point))
    map.on('click', (event) => {
      if (hold.isTapIgnored()) return
      const layers = [brokenLightsLayer, routeHitLayer, chosenRouteLayer].filter((id) =>
        map.getLayer(id),
      )
      const hits = map.queryRenderedFeatures(event.point, { layers })
      const brokenLight = hits.find((hit) => hit.layer.id === brokenLightsLayer)
      const otherRoute = hits.find((hit) => hit.layer.id === routeHitLayer)
      if (brokenLight) latest.current.onBrokenLightTap(String(brokenLight.properties.lampId))
      else if (otherRoute) latest.current.onSelectRoute?.(Number(otherRoute.properties.index))
      // A tap on the chosen route does nothing, so a slip of the finger plans no new walk.
      else if (hits.length === 0) latest.current.onTap?.([event.lngLat.lng, event.lngLat.lat])
    })

    return () => {
      hold.stop()
      map.remove()
      mapRef.current = null
      markersRef.current = null
    }
  }, [])

  useEffect(() => {
    if (mapRef.current?.getSource('routes')) drawMapData(mapRef.current, data)
  })

  useEffect(() => {
    const map = mapRef.current
    const markers = markersRef.current
    if (!map || !markers) return
    for (const [marker, spot] of [
      [markers.start, start],
      [markers.destination, destination],
      [markers.lamp, foundLamp],
      [markers.last, lastLocation],
    ] as const) {
      if (spot) marker.setLngLat(spot).addTo(map)
      else marker.remove()
    }
  }, [start, destination, foundLamp, lastLocation])

  useEffect(() => {
    if (mapRef.current && camera) moveCamera(mapRef.current, camera)
  }, [camera])

  return <div ref={containerRef} className="map-canvas" role="region" aria-label="Map" />
}

export default MapView
