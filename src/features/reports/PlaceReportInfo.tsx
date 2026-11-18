import { reportAge } from './reportAge.ts'
import { reportCategories } from './reportCategories.ts'
import type { PlaceReport } from './reports.ts'

type PlaceReportInfoProps = {
  report: PlaceReport
  onClose: () => void
}

/** Opens when a report on the map is tapped. Only what, where and how old, never who. */
function PlaceReportInfo({ report, onClose }: PlaceReportInfoProps) {
  return (
    <section className="map-sheet" role="dialog" aria-labelledby="place-report-title">
      <h2 id="place-report-title">{reportCategories[report.category].title}</h2>
      <p>Reported {reportAge(report.reportedAt)}.</p>
      <p className="map-note">
        The circle shows the area, not the exact spot, so nobody can tell where the reporter was.
      </p>
      <button type="button" className="button-link" onClick={onClose}>
        Close
      </button>
    </section>
  )
}

export default PlaceReportInfo
