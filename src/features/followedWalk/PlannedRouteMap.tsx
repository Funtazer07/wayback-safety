import { useState } from 'react'
import { isInEindhoven, type LngLat } from '../map/geometry.ts'
import MapView from '../map/MapView.tsx'
import type { CameraMove } from '../map/moveCamera.ts'
import '../map/map.css'

type PlannedRouteMapProps = {
  walkerName: string
  route: LngLat[]
}

/** The plan, not where the walker is now: no position is shown, and the caption says so. */
function PlannedRouteMap({ walkerName, route }: PlannedRouteMapProps) {
  const [camera] = useState<CameraMove>(() => ({
    id: Date.now(),
    kind: 'fit',
    coordinates: route,
    padding: { top: 40, bottom: 40, left: 32, right: 32 },
  }))

  // The map only covers Eindhoven; better no route than half of one.
  if (!route.every(isInEindhoven)) return null

  return (
    <figure className="followed-map">
      <div className="map-area">
        <MapView
          position={null}
          brokenLights={[]}
          routes={[{ coordinates: route }]}
          start={route[0]}
          destination={route.at(-1) ?? null}
          camera={camera}
          onHold={() => {}}
          onBrokenLightTap={() => {}}
        />
      </div>
      <figcaption>The route {walkerName} planned. This is not a live position.</figcaption>
    </figure>
  )
}

export default PlannedRouteMap
