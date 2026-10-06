import MapView from './MapView.tsx'
import './map.css'

type CityMapProps = {
  /** Leaves out the legend under the map, for screens where every pixel counts. */
  isCompact?: boolean
  /** Keeps the user's position up to date and centres the map on it once found. */
  followsUser?: boolean
}

/** The map of Eindhoven as shown on a screen, with a legend that explains the lamp dots. */
function CityMap({ isCompact = false, followsUser = false }: CityMapProps) {
  return (
    <>
      <MapView followsUser={followsUser} />
      {/* The register says where lamps stand, not whether they are on (CONTRIBUTING.md). */}
      {!isCompact && (
        <p className="map-legend">
          <span className="map-legend-lamp" aria-hidden="true" />
          Street light, from the municipality's register
        </p>
      )}
    </>
  )
}

export default CityMap
