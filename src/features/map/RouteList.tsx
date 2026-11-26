import { formatDistance, formatMinutes } from './formatRoute.ts'
import type { MeasuredRoute } from './lamps.ts'
import RouteBadges from './RouteBadges.tsx'
import RouteDescription from './RouteDescription.tsx'
import type { RouteReports } from './routeReports.ts'
import { fastestIndex, mostLightsIndex } from './routeChoice.ts'

type RouteListProps = {
  routes: MeasuredRoute[]
  selectedIndex: number
  reports?: RouteReports[]
  onSelect: (index: number) => void
}

function brokenText(count: number): string {
  return count === 1
    ? '1 light on this route is reported broken'
    : `${count} lights on this route are reported broken`
}

function RouteList({ routes, selectedIndex, onSelect, reports = [] }: RouteListProps) {
  // no routes? Show nothing.
  if (routes.length === 0) return null

  // Find the fastest and best-lit options.
  const fastest = fastestIndex(routes)
  const mostLights = mostLightsIndex(routes)

  return (
    <section
      className="map-sheet route-sheet"
      aria-labelledby="routes-title"
      aria-describedby="route-register-note"
    >
      <h2 id="routes-title">Choose a route</h2>

      <div className="route-list">
        {routes.map((route, index) => {
          return (
            <button
              key={index}
              type="button"
              className="route-card"
              aria-pressed={index === selectedIndex}
              onClick={() => onSelect(index)}
            >
              {/* existing walking time and distance */}
              <span className="route-line">
                <span className="route-top">
                  <span className="route-time">{formatMinutes(route.duration)}</span>

                  <span className="route-muted">{formatDistance(route.length)}</span>
                </span>

                <RouteBadges isMostLights={index === mostLights} isFastest={index === fastest} />
              </span>
              {/* existing route description and reports */}
              <RouteDescription
                isMostLights={index === mostLights}
                isFastest={index === fastest}
                brokenCount={route.brokenCount}
                darkStretchCount={route.darkStretches.length}
                reports={reports[index]}
              />

              {/* existing streetlight measurements */}
              <span className="route-line route-measurements">
                <span className="route-lights">
                  {route.lampCount} lights, {Math.round(route.lampsPerKm)} per km
                </span>

                {index === selectedIndex && <span className="route-shown">On the map</span>}
              </span>

              {/* existing longest gap information */}
              <span className="route-muted route-gap">
                Longest gap between lights: {formatDistance(route.longestDark)}
              </span>

              {/* existing broken-light information */}
              {route.brokenCount > 0 && (
                <span className="route-broken">{brokenText(route.brokenCount)}</span>
              )}
            </button>
          )
        })}
      </div>
      <p className="route-register-note" id="route-register-note">
        Counted from the municipality's register of street lights: where lamps stand, not whether
        they are on. Lights reported as broken, and lights the municipality switches off at night,
        do not count. After dusk, dark stretches of the chosen route are marked with a moon on the
        map. Comparisons use the fastest route as the baseline.
      </p>
    </section>
  )
}

export default RouteList
