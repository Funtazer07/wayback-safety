import { useEffect, useRef, useState } from 'react'
import { isInEindhoven, type LngLat } from './geometry.ts'
import MapView from './MapView.tsx'
import type { CameraMove } from './moveCamera.ts'
import ReportSheets from './ReportSheets.tsx'
import { useReporting } from './useReporting.ts'
import { useUserPosition } from './useUserPosition.ts'
import locateIcon from './assets/locate.svg'
import reportOutline from './assets/report-outline.svg'
import reportFill from './assets/report-fill.svg'
import './map.css'

type WalkMapProps = {
  arrivalLabel?: string
  /** The route chosen on Home, or null when the walk was started without one. */
  route: LngLat[] | null
}

/**
 * The map during a walk: the chosen route, the user's position, and press and hold to report a
 * broken street light. No route planner here: the walk is already on its way.
 */
function WalkMap({ route, arrivalLabel }: WalkMapProps) {
  const { position, start } = useUserPosition()
  const [thankYou, setThankYou] = useState('')
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
    <div className="map-area walk-map">
      <MapView
        position={position}
        brokenLights={reporting.brokenLights}
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
      />
      {thankYou && (
        <p className="map-toast" role="status">
          {thankYou}
        </p>
      )}
      {!reporting.isSheetOpen && (
        <div className="walk-map-controls">
          <button
            type="button"
            className="walk-map-control"
            aria-label="My location"
            title="My location"
            onClick={() => {
              if (position) {
                setCamera({
                  id: Date.now(),
                  kind: 'centre',
                  centre: position.coordinates,
                  zoom: 17,
                })
              } else {
                start()
              }
            }}
          >
            <img src={locateIcon} alt="" width="22" height="22" />
          </button>
          <button
            type="button"
            className="walk-map-control walk-report-placeholder"
            aria-label="Report a street issue (coming soon)"
            title="Street reports are coming soon"
            disabled
          >
            <span className="walk-report-symbol" aria-hidden="true">
              <img className="walk-report-outline" src={reportOutline} alt="" />
              <img className="walk-report-fill" src={reportFill} alt="" />
              <span>+</span>
            </span>
          </button>
        </div>
      )}
      {arrivalLabel && !reporting.isSheetOpen && (
        <p className="walk-arrival-badge">{arrivalLabel}</p>
      )}
      <div className="map-bottom">
        <ReportSheets reporting={reporting} />
      </div>
    </div>
  )
}

export default WalkMap
