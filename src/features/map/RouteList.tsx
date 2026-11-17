
import { formatDistance, formatMinutes } from './formatRoute.ts'
import type { MeasuredRoute } from './lamps.ts'
import RouteBadges from './RouteBadges.tsx'
import RouteDescription from './RouteDescription.tsx'
import type { RouteReports } from './routeReports.ts'
import { fastestIndex, mostLightsIndex } from './routeChoice.ts'

// our new comparison calculator
import { compareRoute } from './routeComparison.ts'

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

function RouteList({
  routes,
  selectedIndex,
  onSelect,
  reports = [],
}: RouteListProps) {
  // no routes? Show nothing.
  if (routes.length === 0) return null

  // Find the fastest and best-lit options.
  const fastest = fastestIndex(routes)
  const mostLights = mostLightsIndex(routes)

  // use the fastest route as our starting point.
  const baseline = routes[fastest]

  return (
    <section
      className="map-sheet route-sheet"
      aria-labelledby="routes-title"
      aria-describedby="route-register-note"
    >
      <h2 id="routes-title">Choose a route</h2>

      <div className="route-list">
        {routes.map((route, index) => {
          // new feature Calculate the comparison.
          const comparison = compareRoute(route, baseline)

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
                  <span className="route-time">
                    {formatMinutes(route.duration)}
                  </span>

                  <span className="route-muted">
                    {formatDistance(route.length)}
                  </span>
                </span>

                <RouteBadges
                  isMostLights={index === mostLights}
                  isFastest={index === fastest}
                />
              </span>

              {/* existing route description and reports */}
              <RouteDescription
                isMostLights={index === mostLights}
                isFastest={index === fastest}
                brokenCount={route.brokenCount}
                reports={reports[index]}
              />

              {/* new feature Our side-by-side comparison */}
              <span className="route-comparison">
                <span className="route-comparison-box">
                  <span className="comparison-label">
                    Streetlights
                  </span>

                  <strong
                    className={
                      comparison.lightingPercent !== null &&
                      comparison.lightingPercent > 0
                        ? 'comparison-positive'
                        : ''
                    }
                  >
                    {comparison.lightingText}
                  </strong>

                  <span className="comparison-detail">
                    {comparison.lightsPerKm} lights/km
                  </span>
                </span>

                <span className="route-comparison-box">
                  <span className="comparison-label">
                    Extra walking
                  </span>

                  <strong>
                    {comparison.timeText}
                  </strong>

                  <span className="comparison-detail">
                    vs fastest route
                  </span>
                </span>
              </span>

              {/* existing streetlight measurements */}
              <span className="route-line route-measurements">
                <span className="route-lights">
                  {route.lampCount} lights,{' '}
                  {Math.round(route.lampsPerKm)} per km
                </span>

                {index === selectedIndex && (
                  <span className="route-shown">
                    On the map
                  </span>
                )}
              </span>

              {/* existing longest gap information */}
              <span className="route-muted route-gap">
                Longest gap between lights:{' '}
                {formatDistance(route.longestDark)}
              </span>

              {/* existing broken-light information */}
              {route.brokenCount > 0 && (
                <span className="route-broken">
                  {brokenText(route.brokenCount)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p
        className="route-register-note"
        id="route-register-note"
      >
        Streetlight counts come from the municipality's
        register. They show where streetlights are recorded,
        not how bright the road actually is. Reported broken
        lights are excluded. Comparisons use the fastest
        route as the baseline.
      </p>
    </section>
  )
}

export default RouteList
