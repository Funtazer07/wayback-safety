import { formatDistance, formatMinutes } from './formatRoute.ts'
import type { MeasuredRoute } from './lamps.ts'
import RouteBadges from './RouteBadges.tsx'
import { fastestIndex, mostLightsIndex } from './routeChoice.ts'

type RouteListProps = {
  routes: MeasuredRoute[]
  selectedIndex: number
  onSelect: (index: number) => void
}

function brokenText(count: number): string {
  return count === 1
    ? '1 light on this route is reported broken'
    : `${count} lights on this route are reported broken`
}

/** The routes to choose from, one compact row each, so all of them compare at a glance. */
function RouteList({ routes, selectedIndex, onSelect }: RouteListProps) {
  const fastest = fastestIndex(routes)
  const mostLights = mostLightsIndex(routes)

  return (
    <section className="map-sheet route-sheet" aria-labelledby="routes-title">
      <h2 id="routes-title">Choose a route</h2>
      <div className="route-list">
        {routes.map((route, index) => (
          <button
            // The whole list is replaced after each plan, so the place in the list is a fine key.
            key={index}
            type="button"
            className="route-card"
            aria-pressed={index === selectedIndex}
            onClick={() => onSelect(index)}
          >
            <span className="route-line">
              <span className="route-top">
                <span className="route-time">{formatMinutes(route.duration)}</span>
                <span className="route-muted">{formatDistance(route.length)}</span>
              </span>
              <RouteBadges isMostLights={index === mostLights} isFastest={index === fastest} />
            </span>
            <span className="route-line">
              <span className="route-lights">
                {route.lampCount} lights, {Math.round(route.lampsPerKm)} per km
              </span>
              {index === selectedIndex && <span className="route-shown">On the map</span>}
            </span>
            <span className="route-muted route-gap">
              Longest gap between lights: {formatDistance(route.longestDark)}
            </span>
            {route.brokenCount > 0 && (
              <span className="route-broken">{brokenText(route.brokenCount)}</span>
            )}
          </button>
        ))}
      </div>
      <p className="map-note">
        Counted from the municipality's register of street lights: where lamps stand, not whether
        they are on. Lights reported as broken do not count.
      </p>
    </section>
  )
}

export default RouteList
