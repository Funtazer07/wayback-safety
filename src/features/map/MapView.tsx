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
  placeReportsLayer,
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

type MapViewProps = Partial<Pick<MapData, 'routes' | 'selectedIndex' | 'placeReports'>> &
  Pick<MapData, 'brokenLights' | 'position'> & {
    start?: LngLat | null
    destination?: LngLat | null
    foundLamp?: LngLat | null
    lastLocation?: LngLat | null
    camera?: CameraMove | null
    onTap?: (point: LngLat) => void
    onHold: (point: LngLat) => void
    onSelectRoute?: (index: number) => void
    onBrokenLightTap: (lampId: string) => void
    onPlaceReportTap?: (id: string) => void
  }

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
    placeReports: props.placeReports ?? [],
    position: props.position,
  }
  // MapLibre keeps its first handlers, so they read the latest props through a ref.
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
      // Added below, bottom left: the round buttons of the walk map sit bottom right.
      attributionControl: false,
    })
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'Routes © openrouteservice.org by HeiGIT',
      }),
      'bottom-left',
    )
    mapRef.current = map
    markersRef.current = {
      start: startMarker(),
      destination: destinationMarker(),
      lamp: foundLampMarker(),
      last: lastLocationMarker(),
    }

    // MapLibre opens the map credits as soon as it knows them. They are closed once, so they stay
    // one tap away behind the "i" button: a calmer screen that still names the map makers.
    const closeCredits = () => {
      const credits = container.querySelector('.maplibregl-ctrl-attrib.maplibregl-compact-show')
      if (!credits) return
      credits.classList.remove('maplibregl-compact-show')
      map.off('data', closeCredits)
    }
    map.on('data', closeCredits)

    map.on('style.load', async () => {
      await addOurLayers(map)
      drawMapData(map, dataRef.current)
    })

    const hold = watchHold(map, (point) => latest.current.onHold(point))
    map.on('click', (event) => {
      if (hold.isTapIgnored()) return
      const layers = [brokenLightsLayer, placeReportsLayer, routeHitLayer, chosenRouteLayer].filter(
        (id) => map.getLayer(id),
      )
      const hits = map.queryRenderedFeatures(event.point, { layers })
      const brokenLight = hits.find((hit) => hit.layer.id === brokenLightsLayer)
      const placeReport = hits.find((hit) => hit.layer.id === placeReportsLayer)
      const otherRoute = hits.find((hit) => hit.layer.id === routeHitLayer)
      if (brokenLight) latest.current.onBrokenLightTap(String(brokenLight.properties.lampId))
      else if (placeReport) latest.current.onPlaceReportTap?.(String(placeReport.properties.id))
      else if (otherRoute) latest.current.onSelectRoute?.(Number(otherRoute.properties.index))
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
