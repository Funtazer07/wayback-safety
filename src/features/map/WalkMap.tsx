import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReportPlaceSheet from '../reports/ReportPlaceSheet.tsx'
import { isInEindhoven, type LngLat } from './geometry.ts'
import MapView from './MapView.tsx'
import type { CameraMove } from './moveCamera.ts'
import ReportSheets from './ReportSheets.tsx'
import { useReporting } from './useReporting.ts'
import { useUserPosition } from './useUserPosition.ts'
import locationIcon from '../../assets/day/location.png'
import reportIcon from '../../assets/day/report.png'
import './map.css'

type WalkMapProps = {
  route: LngLat[] | null
  arrivalLabel?: string
}

function WalkMap({ route, arrivalLabel }: WalkMapProps) {
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
      {arrivalLabel && !reporting.isSheetOpen && <p className="map-arrival">{arrivalLabel}</p>}
      {!reporting.isSheetOpen && (
        <div className="map-actions">
          {position && (
            <button
              type="button"
              className="map-locate"
              aria-label="My location"
              onClick={() =>
                setCamera({
                  id: Date.now(),
                  kind: 'centre',
                  centre: position.coordinates,
                  zoom: 17,
                })
              }
            >
              <img src={locationIcon} alt="" />
            </button>
          )}
          {/* SCRUM-96: one tap opens the report form for the spot where the user is now. */}
          <button
            type="button"
            className="map-report"
            aria-label="Report"
            onClick={() => {
              setThankYou('')
              setIsReportingPlace(true)
            }}
          >
            <img src={reportIcon} alt="" />
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
