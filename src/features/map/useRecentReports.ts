import { useEffect, useState } from 'react'
import type { PlaceReport } from '../reports/reports.ts'
import type { BrokenLight } from './brokenLights.ts'
import { isInEindhoven, type LngLat } from './geometry.ts'
import { getRecentReports } from './recentReports.ts'

// Assumption: new reports from others may show up to five minutes late, to keep the requests few.
const RELOAD_EVERY_MINUTES = 5

type RecentReportsInput = {
  placeReports: PlaceReport[]
  brokenLights: BrokenLight[]
  userPosition: LngLat | null
  route: LngLat[] | null
  reload: () => void
}

/** Recent reports near the user or the route; the ages and the reports themselves stay fresh. */
export function useRecentReports({
  placeReports,
  brokenLights,
  userPosition,
  route,
  reload,
}: RecentReportsInput) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let minutes = 0
    const interval = window.setInterval(() => {
      minutes += 1
      if (minutes % RELOAD_EVERY_MINUTES === 0) reload()
      setNow(new Date())
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [reload])

  const position = userPosition && isInEindhoven(userPosition) ? userPosition : null

  return {
    reports: getRecentReports(placeReports, brokenLights, position, route, now),
    canSearch: position !== null || (route !== null && route.length >= 2),
    now,
  }
}
