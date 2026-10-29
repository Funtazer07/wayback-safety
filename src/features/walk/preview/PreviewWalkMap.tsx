import MapView from '../../map/MapView.tsx'
import '../../map/map.css'

function PreviewWalkMap() {
  return (
    <div className="map-area">
      <MapView position={null} brokenLights={[]} onHold={() => {}} onBrokenLightTap={() => {}} />
    </div>
  )
}

export default PreviewWalkMap
