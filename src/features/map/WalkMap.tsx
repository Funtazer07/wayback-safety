import { useEffect, useRef, useState } from 'react'
import { isInEindhoven, type LngLat } from './geometry.ts'
import MapView from './MapView.tsx'
import type { CameraMove } from './moveCamera.ts'
import ReportSheets from './ReportSheets.tsx'
import { useReporting } from './useReporting.ts'
import { useUserPosition } from './useUserPosition.ts'
import './map.css'

type WalkMapProps = {
  /** The route chosen on Home, or null when the walk was started without one. */
  route: LngLat[] | null
}

/**
 * The map during a walk: the chosen route, the user's position, and press and hold to report a
 * broken street light. No route planner here: the walk is already on its way.
 */
function WalkMap({ route }: WalkMapProps) {
  const { position, start } = useUserPosition()
  const [thankYou, setThankYou] = useState('')
  const reporting = useReporting((_lights, message) => setThankYou(message))
  // The map opens showing the whole route. Without a route it centres on the user the first time
  // instead. After that the user can look around freely, and "My location" brings them back.
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
      {position && !reporting.isSheetOpen && (
        <button
          type="button"
          className="map-locate"
          onClick={() =>
            setCamera({ id: Date.now(), kind: 'centre', centre: position.coordinates, zoom: 17 })
          }
        >
          My location
        </button>
      )}
      <div className="map-bottom">
        <ReportSheets reporting={reporting} />
      </div>
    </div>
  )
}

export default WalkMap
