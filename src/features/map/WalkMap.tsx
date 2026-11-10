import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReportPlaceSheet from '../reports/ReportPlaceSheet.tsx'
import { isInEindhoven, type LngLat } from './geometry.ts'
import MapView from './MapView.tsx'
import type { CameraMove } from './moveCamera.ts'
import ReportSheets from './ReportSheets.tsx'
import { useReporting } from './useReporting.ts'
import { useUserPosition } from './useUserPosition.ts'
import './map.css'

type WalkMapProps = {
  route: LngLat[] | null
}

function WalkMap({ route }: WalkMapProps) {
  const { position, isUnavailable, start } = useUserPosition()
  const [thankYou, setThankYou] = useState('')
  const [isReportingPlace, setIsReportingPlace] = useState(false)
  const reporting = useReporting((_lights, message) => setThankYou(message))
  const [camera, setCamera] = useState<CameraMove | null>(() =>
    route
      ? {
          id: Date.now(),
          kind: 'fit',
          coordinates: route,
          padding: { top: 48, bottom: 48, left: 32, right: 32 },
        }
      : null,
  )
  const hasMoved = useRef(route !== null)

  useEffect(() => start(), [start])

  useEffect(() => {
    if (hasMoved.current || !position || !isInEindhoven(position.coordinates)) return
    hasMoved.current = true
    setCamera({ id: Date.now(), kind: 'centre', centre: position.coordinates, zoom: 17 })
  }, [position])

  return (
    <div className="map-area">
      <MapView
        position={position}
        brokenLights={reporting.brokenLights}
        placeReports={reporting.placeReports}
        routes={route ? [{ coordinates: route }] : []}
        destination={route?.at(-1) ?? null}
        foundLamp={reporting.menu?.state === 'found' ? reporting.menu.lamp.coordinates : null}
        camera={camera}
        onTap={() => {
          reporting.closeAll()
          setThankYou('')
        }}
        onHold={(point) => {
          setThankYou('')
          reporting.startReport(point)
        }}
        onBrokenLightTap={reporting.showLight}
        onPlaceReportTap={reporting.showPlaceReport}
      />
      {thankYou && (
        <p className="map-toast" role="status">
          {thankYou}
        </p>
      )}
      {!reporting.isSheetOpen && (
        <div className="map-actions">
          {position && (
            <button
              type="button"
              className="map-locate"
              onClick={() =>
                setCamera({
                  id: Date.now(),
                  kind: 'centre',
                  centre: position.coordinates,
                  zoom: 17,
                })
              }
            >
              My location
            </button>
          )}
          {/* SCRUM-96: one tap opens the report form for the spot where the user is now. */}
          <button
            type="button"
            className="map-report"
            onClick={() => {
              setThankYou('')
              setIsReportingPlace(true)
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
            </svg>
            Report
          </button>
        </div>
      )}
      <div className="map-bottom">
        <ReportSheets reporting={reporting} />
      </div>
      {/* Placed on the page itself: inside the map's own layer the walk panel would show through. */}
      {isReportingPlace &&
        createPortal(
          <ReportPlaceSheet
            position={position?.coordinates ?? null}
            isLocationOff={isUnavailable}
            onClose={() => setIsReportingPlace(false)}
            onSent={reporting.reloadPlaceReports}
          />,
          document.body,
        )}
    </div>
  )
}

export default WalkMap
