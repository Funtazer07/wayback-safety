import { useState } from 'react'
import { isInEindhoven, type LngLat } from '../map/geometry.ts'
import MapView from '../map/MapView.tsx'
import type { CameraMove } from '../map/moveCamera.ts'
import { formatClock } from '../walk/time.ts'
import '../map/map.css'

type LastLocationMapProps = {
  coordinates: LngLat
  savedAt: Date
}

/** The map on screen 10: one pin where the walker was last seen, nothing else. */
function LastLocationMap({ coordinates, savedAt }: LastLocationMapProps) {
  // Centre on the pin once, then let the contact look around.
  const [camera] = useState<CameraMove>(() => ({
    id: Date.now(),
    kind: 'centre',
    centre: coordinates,
    zoom: 16,
  }))

  // The map only covers Eindhoven (SCRUM-26), so a point outside it cannot be shown there.
  if (!isInEindhoven(coordinates)) {
    return (
      <p className="followed-note">
        The last location, from {formatClock(savedAt)}, is outside Eindhoven, so the map cannot show
        it. It was at {coordinates[1].toFixed(4)}, {coordinates[0].toFixed(4)}.
      </p>
    )
  }

  return (
    <figure className="followed-map">
      <div className="map-area">
        <MapView
          position={null}
          brokenLights={[]}
          lastLocation={coordinates}
          camera={camera}
          // A contact only looks; nothing to plan or report here.
          onHold={() => {}}
          onBrokenLightTap={() => {}}
        />
      </div>
      <figcaption>Last location at {formatClock(savedAt)}</figcaption>
    </figure>
  )
}

export default LastLocationMap
