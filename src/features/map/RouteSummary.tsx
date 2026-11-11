import { formatDistance, formatMinutes } from './formatRoute.ts'
import type { MeasuredRoute } from './lamps.ts'
import RouteBadges from './RouteBadges.tsx'
import RouteDescription from './RouteDescription.tsx'
import type { RouteReports } from './routeReports.ts'
import { fastestIndex, mostLightsIndex } from './routeChoice.ts'

type RouteSummaryProps = {
  routes: MeasuredRoute[]
  selectedIndex: number
  reports?: RouteReports[]
  onShowAll: () => void
}

function RouteSummary({ routes, selectedIndex, onShowAll, reports = [] }: RouteSummaryProps) {
  const route = routes[selectedIndex]

  return (
    <section className="map-sheet route-summary" aria-label="Your route">
      <p className="route-summary-text">
        <RouteBadges
          isMostLights={selectedIndex === mostLightsIndex(routes)}
          isFastest={selectedIndex === fastestIndex(routes)}
        />
        <span className="route-time">{formatMinutes(route.duration)}</span>
        <span className="route-distance">{formatDistance(route.length)}</span>
        <RouteDescription
          isMostLights={selectedIndex === mostLightsIndex(routes)}
          isFastest={selectedIndex === fastestIndex(routes)}
          brokenCount={route.brokenCount}
          reports={reports[selectedIndex]}
        />
      </p>
      <button type="button" onClick={onShowAll}>
        Other routes
      </button>
    </section>
  )
}

export default RouteSummary
