import MapView from '../../map/MapView.tsx'
import '../../map/map.css'

// The same map as during a walk, but without reading the location or reporting, for this demo.
function PreviewWalkMap() {
  return (
    <div className="map-area">
      <MapView position={null} brokenLights={[]} onHold={() => {}} onBrokenLightTap={() => {}} />
    </div>
  )
}

export default PreviewWalkMap
