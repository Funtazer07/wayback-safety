import { formatDistance, formatMinutes } from './formatRoute.ts'
import type { MeasuredRoute } from './lamps.ts'
import RouteBadges from './RouteBadges.tsx'
import { fastestIndex, mostLightsIndex } from './routeChoice.ts'

type RouteSummaryProps = {
  routes: MeasuredRoute[]
  selectedIndex: number
  onShowAll: () => void
}

/** The chosen route in one bar, once the list is closed, so most of the screen is map. */
function RouteSummary({ routes, selectedIndex, onShowAll }: RouteSummaryProps) {
  const route = routes[selectedIndex]
  const details = [
    formatDistance(route.length),
    `${route.lampCount} lights`,
    ...(route.brokenCount > 0 ? [`${route.brokenCount} broken`] : []),
  ].join(' · ')

  return (
    <section className="map-sheet route-summary" aria-label="Your route">
      <p className="route-summary-text">
        <RouteBadges
          isMostLights={selectedIndex === mostLightsIndex(routes)}
          isFastest={selectedIndex === fastestIndex(routes)}
        />
        <span className="route-time">{formatMinutes(route.duration)}</span>
        <span className="route-muted">{details}</span>
      </p>
      <button type="button" onClick={onShowAll}>
        Other routes
      </button>
    </section>
  )
}

export default RouteSummary
