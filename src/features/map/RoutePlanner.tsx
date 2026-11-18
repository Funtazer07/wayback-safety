
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReportPlaceSheet from '../reports/ReportPlaceSheet.tsx'
import { isInEindhoven } from './geometry.ts'
import MapView from './MapView.tsx'
import type { CameraMove } from './moveCamera.ts'
import { locationMessage, plannerHint } from './plannerHint.ts'
import DestinationSearch from './DestinationSearch.tsx'
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

// list for nearby recent reports
import RecentReportsList from './RecentReportsList.tsx'

// filter for recent reports
import {
  getRecentReports,
  type RecentReport,
} from './recentReports.ts'

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
  const [searchKey, setSearchKey] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { position } = location
  const isOutside = position !== null && !isInEindhoven(position.coordinates)

  // keep the time updated for the recent reports filter
  const [now, setNow] = useState(() => new Date())

  // refresh the time every minute
  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date())
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [])

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

  // get recent reports near the user or the selected route
  const recentReports = getRecentReports(
    reporting.placeReports,
    reporting.brokenLights,
    !isOutside ? (position?.coordinates ?? null) : null,
    shownRoute?.coordinates ?? null,
    now,
  )

  // open the report on the map when someone selects it
  function selectRecentReport(report: RecentReport) {
    setCamera({
      id: Date.now(),
      kind: 'centre',
      centre: report.coordinates,
      zoom: 17,
    })

    if (report.kind === 'broken_light') {
      reporting.showLight(report.id)
    } else {
      reporting.showPlaceReport(report.id)
    }
  }

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
            onStartOver={() => {
              reporting.closeAll()
              setSearchKey((key) => key + 1)
              planner.reset()
            }}
          />
        }
        hint={plannerHint({
          hasRoutes,
          isChoosing: planner.isChoosing,
          hasStart: planner.start !== null,
        })}
        status={status}
      />

      {/* show the list when we have a location or route and no report sheet is open */}
      {!reporting.isSheetOpen &&
        !isReportingPlace &&
        ((!isOutside && position !== null) || shownRoute !== null) && (
          <RecentReportsList
            reports={recentReports}
            now={now}
            onSelect={selectRecentReport}
          />
        )}

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
