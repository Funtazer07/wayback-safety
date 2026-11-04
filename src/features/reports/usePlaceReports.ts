import { useCallback, useEffect, useState } from 'react'
import { fetchPlaceReports, type PlaceReport } from './reports.ts'

/** The place reports to show on the map. reload() fetches them again, after a new report. */
export function usePlaceReports() {
  const [placeReports, setPlaceReports] = useState<PlaceReport[]>([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let isCurrent = true
    fetchPlaceReports()
      .then((reports) => isCurrent && setPlaceReports(reports))
      // The map works without the reports, so a failed load is not an error.
      .catch(() => {})
    return () => {
      isCurrent = false
    }
  }, [version])

  const reload = useCallback(() => setVersion((current) => current + 1), [])

  return { placeReports, reload }
}
