import { useEffect, useRef, useState } from 'react'
import { isInEindhoven } from './geometry.ts'
import MapView from './MapView.tsx'
import type { CameraMove } from './moveCamera.ts'
import { locationMessage, plannerHint } from './plannerHint.ts'
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
  /**
   * Hears which route is on the map, so the walk can show it too and the start-walk screen can
   * estimate the arrival. Null when there is none.
   */
  onRouteChange: (route: PlannedRoute | null) => void
}

/**
 * The map on Home: tap where you want to go, compare routes by their street lights, and press and
 * hold to report a broken light.
 */
function RoutePlanner({ onRouteChange }: RoutePlannerProps) {
  const location = useUserPosition()
  const planner = usePlanner(location.position)
  const reporting = useReporting((lights, thankYou) => planner.replan(lights, thankYou))
  const [camera, setCamera] = useState<CameraMove | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { position } = location
  const isOutside = position !== null && !isInEindhoven(position.coordinates)

  // Fly to the user the first time their position is known, unless a walk is being planned.
  const hasCentred = useRef(false)
  useEffect(() => {
    if (!position || isOutside || hasCentred.current || planner.destination) return
    hasCentred.current = true
    setCamera({ id: Date.now(), kind: 'centre', centre: position.coordinates, zoom: 16 })
  }, [position, isOutside, planner.destination])

  // Zoom out to all new routes, keeping the room the panels take free. Only a new plan moves the
  // map, not choosing another route or planning again after a report.
  const { newRoutes } = planner
  useEffect(() => {
    if (!newRoutes) return
    setCamera({
      id: Date.now(),
      kind: 'fit',
      coordinates: newRoutes.flatMap((route) => route.coordinates),
      padding: {
        // Extra room on top: the destination pin sticks out above the spot it marks.
        top: (panelRef.current?.offsetHeight ?? 0) + 56,
        bottom: (bottomRef.current?.offsetHeight ?? 0) + 24,
        left: 32,
        right: 32,
      },
    })
  }, [newRoutes])

  // The route on the map is the one the walk will show, also when the user did not tap a card.
  const shownRoute = planner.routes[planner.selectedIndex] ?? null
  useEffect(
    () =>
      onRouteChange(
        shownRoute && {
          coordinates: shownRoute.coordinates,
          seconds: shownRoute.duration,
          metres: shownRoute.length,
        },
      ),
    [shownRoute, onRouteChange],
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
        routes={planner.routes}
        selectedIndex={planner.selectedIndex}
        start={planner.chosenStart}
        destination={planner.destination}
        foundLamp={reporting.menu?.state === 'found' ? reporting.menu.lamp.coordinates : null}
        camera={camera}
        // With a sheet open, a tap on the map closes it instead of planning a walk.
        onTap={(point) =>
          reporting.isSheetOpen
            ? reporting.closeAll()
            : planner.tapPlace(point, reporting.brokenLights)
        }
        onHold={reporting.startReport}
        onSelectRoute={(index) => !reporting.isSheetOpen && planner.selectRoute(index)}
        onBrokenLightTap={reporting.showLight}
      />
      <PlannerPanel
        panelRef={panelRef}
        hint={plannerHint({
          hasRoutes,
          isChoosing: planner.isChoosing,
          hasStart: planner.start !== null,
        })}
        status={status}
        onLocate={locate}
        onStartOver={() => {
          reporting.closeAll()
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
