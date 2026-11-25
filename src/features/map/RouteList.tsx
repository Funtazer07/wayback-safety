
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

          // SCRUM-137: Show the comparison on alternative routes.
          const isAlternative = index !== fastest

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
                darkStretchCount={route.darkStretches.length}
                reports={reports[index]}
              />

              {/* SCRUM-137: Compact lighting and time comparison */}
              {isAlternative && (
                <span className="route-compare">
                  <span className="route-compare-item">
                    <svg
                      className="route-compare-clock"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    <span>{comparison.timeText}</span>
                  </span>
                </span>
              )}

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
        Counted from the municipality's register of street
        lights: where lamps stand, not whether they are on.
        Lights reported as broken, and lights the
        municipality switches off at night, do not count.
        After dusk, dark stretches of the chosen route are
        marked with a moon on the map. Comparisons use the
        fastest route.
      </p>
    </section>
  )
}

export default RouteList
