import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReportPlaceSheet from '../reports/ReportPlaceSheet.tsx'
import { isInEindhoven } from './geometry.ts'
import MapView from './MapView.tsx'
import type { CameraMove } from './moveCamera.ts'
import { locationMessage, plannerHint } from './plannerHint.ts'
import PlannerPanel from './PlannerPanel.tsx'
import ReportSheets from './ReportSheets.tsx'
import RouteList from './RouteList.tsx'
import RouteDrawer from './RouteDrawer.tsx'
import { reportsAlongRoutes } from './routeReports.ts'
import RouteSummary from './RouteSummary.tsx'
import { usePlanner } from './usePlanner.ts'
import { useReporting } from './useReporting.ts'
import type { PlannedRoute } from './walkRoute.ts'
import { useUserPosition } from './useUserPosition.ts'
import locationIcon from '../../assets/day/location.png'
import reportIcon from '../../assets/day/report.png'
import './map.css'

type RoutePlannerProps = {
  onRouteChange: (route: PlannedRoute | null) => void
  onStartWalk?: () => void
}

function RoutePlanner({ onRouteChange, onStartWalk }: RoutePlannerProps) {
  const [isReportingPlace, setIsReportingPlace] = useState(false)
  const location = useUserPosition()
  const planner = usePlanner(location.position)
  const reporting = useReporting((lights, thankYou) => planner.replan(lights, thankYou))
  const [camera, setCamera] = useState<CameraMove | null>(null)
  const [isLocating, setIsLocating] = useState(false)
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

  const routeReports = reportsAlongRoutes(
    planner.routes,
    reporting.placeReports,
    reporting.brokenLights,
  )
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
        placeReports={reporting.placeReports}
        routes={planner.routes}
        selectedIndex={planner.selectedIndex}
        start={planner.chosenStart}
        destination={planner.destination}
        foundLamp={reporting.menu?.state === 'found' ? reporting.menu.lamp.coordinates : null}
        camera={camera}
        onTap={(point) =>
          reporting.isSheetOpen
            ? reporting.closeAll()
            : planner.tapPlace(point, reporting.brokenLights)
        }
        onHold={reporting.startReport}
        onSelectRoute={(index) => !reporting.isSheetOpen && planner.selectRoute(index)}
        onBrokenLightTap={reporting.showLight}
        onPlaceReportTap={reporting.showPlaceReport}
      />
      <PlannerPanel
        panelRef={panelRef}
        hint={plannerHint({
          hasRoutes,
          isChoosing: planner.isChoosing,
          hasStart: planner.start !== null,
        })}
        status={status}
        onStartOver={() => {
          reporting.closeAll()
          planner.reset()
        }}
      />
      {!reporting.isSheetOpen && !planner.destination && (
        <div className="map-actions planner-actions">
          <button
            type="button"
            className="map-locate"
            aria-label="My location"
            title="Get my location"
            onClick={locate}
          >
            <img src={locationIcon} alt="" />
          </button>
          <button
            type="button"
            className="map-report"
            aria-label="Report"
            onClick={() => setIsReportingPlace(true)}
          >
            <img src={reportIcon} alt="" />
          </button>
        </div>
      )}
      {isReportingPlace &&
        createPortal(
          <ReportPlaceSheet
            position={position?.coordinates ?? null}
            isLocationOff={location.isUnavailable}
            onClose={() => setIsReportingPlace(false)}
            onSent={reporting.reloadPlaceReports}
          />,
          document.body,
        )}
      <div ref={bottomRef} className="map-bottom">
        {reporting.isSheetOpen ? (
          <ReportSheets reporting={reporting} />
        ) : hasRoutes ? (
          <RouteDrawer>
            {planner.isChoosing ? (
              <RouteList
                routes={planner.routes}
                selectedIndex={planner.selectedIndex}
                reports={routeReports}
                onSelect={planner.selectRoute}
              />
            ) : (
              <RouteSummary
                routes={planner.routes}
                selectedIndex={planner.selectedIndex}
                reports={routeReports}
                onShowAll={planner.showAllRoutes}
              />
            )}
            {routeReports.some(
              (report) =>
                report.quietCount +
                  report.darkCount +
                  report.unsafeCount +
                  report.otherCount +
                  report.brokenCount >
                0,
            ) && <p className="route-source-note">Based on nearby user reports.</p>}
            {onStartWalk && (
              <div className="map-route-actions">
                <button
                  type="button"
                  className="map-route-cancel"
                  onClick={() => {
                    reporting.closeAll()
                    planner.reset()
                  }}
                >
                  Cancel
                </button>
                <button type="button" className="button-primary" onClick={onStartWalk}>
                  Start walk
                </button>
              </div>
            )}
          </RouteDrawer>
        ) : null}
      </div>
    </div>
  )
}

export default RoutePlanner
