import { useEffect, useRef, useState } from 'react'
import { isInEindhoven } from './geometry.ts'
import MapView from './MapView.tsx'
import type { CameraMove } from './moveCamera.ts'
import { locationMessage, plannerHint } from './plannerHint.ts'
import DestinationSearch from './DestinationSearch.tsx'
import PlannerPanel from './PlannerPanel.tsx'
import ReportSheets from './ReportSheets.tsx'
import RouteList from './RouteList.tsx'
import RouteSummary from './RouteSummary.tsx'
import { usePlanner } from './usePlanner.ts'
import { useReporting } from './useReporting.ts'
import type { PlannedRoute } from './walkRoute.ts'
import { useUserPosition } from './useUserPosition.ts'
import './map.css'

type RoutePlannerProps = {
  onRouteChange: (route: PlannedRoute | null) => void
}

function RoutePlanner({ onRouteChange }: RoutePlannerProps) {
  const location = useUserPosition()
  const planner = usePlanner(location.position)
  const reporting = useReporting((lights, thankYou) => planner.replan(lights, thankYou))
  const [camera, setCamera] = useState<CameraMove | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [searchKey, setSearchKey] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { position } = location
  const isOutside = position !== null && !isInEindhoven(position.coordinates)

  const hasCentred = useRef(false)
  useEffect(() => {
    if (!position || isOutside || hasCentred.current || planner.destination) return
    hasCentred.current = true
    setCamera({ id: Date.now(), kind: 'centre', centre: position.coordinates, zoom: 16 })
  }, [position, isOutside, planner.destination])

  // Only a new plan moves the map, not choosing another route.
  const { newRoutes } = planner
  useEffect(() => {
    if (!newRoutes) return
    setCamera({
      id: Date.now(),
      kind: 'fit',
      coordinates: newRoutes.flatMap((route) => route.coordinates),
      padding: {
        // The destination pin sticks out above its spot.
        top: (panelRef.current?.offsetHeight ?? 0) + 56,
        bottom: (bottomRef.current?.offsetHeight ?? 0) + 24,
        left: 32,
        right: 32,
      },
    })
  }, [newRoutes])

  const shownRoute = planner.routes[planner.selectedIndex] ?? null
  const { destinationLabel } = planner
  useEffect(
    () =>
      onRouteChange(
        shownRoute && {
          coordinates: shownRoute.coordinates,
          seconds: shownRoute.duration,
          metres: shownRoute.length,
          destinationLabel,
        },
      ),
    [shownRoute, destinationLabel, onRouteChange],
  )

  function locate() {
    if (position && !isOutside) {
      setCamera({ id: Date.now(), kind: 'centre', centre: position.coordinates, zoom: 16 })
      return
    }
    setIsLocating(true)
    location.start()
  }

  const hasRoutes = planner.routes.length > 0
  const status =
    planner.status ||
    locationMessage({
      isLocating: isLocating && !position,
      isUnavailable: location.isUnavailable,
      isOutside,
    })

  return (
    <div className="map-area planner">
      <MapView
        position={position}
        brokenLights={reporting.brokenLights}
        placeReports={reporting.placeReports}
        routes={planner.routes}
        selectedIndex={planner.selectedIndex}
        start={planner.chosenStart}
        destination={planner.destination}
        foundLamp={reporting.menu?.state === 'found' ? reporting.menu.lamp.coordinates : null}
        camera={camera}
        onTap={(point) => {
          if (reporting.isSheetOpen) {
            reporting.closeAll()
            return
          }
          if (planner.start) setSearchKey((key) => key + 1)
          planner.tapPlace(point, reporting.brokenLights)
        }}
        onHold={reporting.startReport}
        onSelectRoute={(index) => !reporting.isSheetOpen && planner.selectRoute(index)}
        onBrokenLightTap={reporting.showLight}
        onPlaceReportTap={reporting.showPlaceReport}
      />
      <PlannerPanel
        panelRef={panelRef}
        search={
          <DestinationSearch
            // A new key empties the field, after Start over or a destination tapped on the map.
            key={searchKey}
            onGo={(coordinates, label) => {
              reporting.closeAll()
              // With a start the new routes move the map; without one, show the place itself.
              if (!planner.start) {
                setCamera({ id: Date.now(), kind: 'centre', centre: coordinates, zoom: 16 })
              }
              planner.goTo(coordinates, label, reporting.brokenLights)
            }}
          />
        }
        hint={plannerHint({
          hasRoutes,
          isChoosing: planner.isChoosing,
          hasStart: planner.start !== null,
        })}
        status={status}
        onLocate={locate}
        onStartOver={() => {
          reporting.closeAll()
          setSearchKey((key) => key + 1)
          planner.reset()
        }}
      />
      <div ref={bottomRef} className="map-bottom">
        {reporting.isSheetOpen ? (
          <ReportSheets reporting={reporting} />
        ) : hasRoutes && planner.isChoosing ? (
          <RouteList
            routes={planner.routes}
            selectedIndex={planner.selectedIndex}
            onSelect={planner.selectRoute}
          />
        ) : hasRoutes ? (
          <RouteSummary
            routes={planner.routes}
            selectedIndex={planner.selectedIndex}
            onShowAll={planner.showAllRoutes}
          />
        ) : null}
      </div>
    </div>
  )
}

export default RoutePlanner
